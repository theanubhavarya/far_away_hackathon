import os
import re
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, List, Optional

import pandas as pd


RouteRecord = Dict[str, object]
ApiSearch = Callable[[str, str, datetime], List[RouteRecord]]

CITY_ALIASES = {
    "bangalore": "Bangalore",
    "banglore": "Bangalore",
    "bengaluru": "Bangalore",
    "cochin": "Kochi",
    "kochi": "Kochi",
    "delhi": "Delhi",
    "new delhi": "Delhi",
    "mumbai": "Mumbai",
    "bombay": "Mumbai",
    "indira gandhi international airport": "Delhi",
    "kempegowda international airport": "Bangalore",
    "chhatrapati shivaji maharaj international airport": "Mumbai",
    "mumbai international airport": "Mumbai",
    "bangalore international airport": "Bangalore",
    "delhi international airport": "Delhi",
}

STATION_CODES = {
    "Bangalore": {"SBC", "YPR", "KJM", "BAND"},
    "Delhi": {"NDLS", "NZM"},
    "Mumbai": {"CSMT", "BCT", "MMCT", "BDTS", "LTT", "DR"},
}


def normalize_city(value: object) -> str:
    text = str(value).strip()
    if "·" in text:
        text = text.split("·")[0].strip()
    
    folded = text.casefold()
    if folded in CITY_ALIASES:
        return CITY_ALIASES[folded]
        
    for alias, canonical in CITY_ALIASES.items():
        if alias in folded:
            return canonical
            
    return text.title()


def parse_duration_minutes(value: object) -> Optional[float]:
    if pd.isna(value):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().lower()
    hours = re.search(r"(\d+)\s*hrs?", text)
    minutes = re.search(r"(\d+)\s*mins?", text)
    if hours or minutes:
        return float((int(hours.group(1)) if hours else 0) * 60 + (int(minutes.group(1)) if minutes else 0))
    try:
        return float(text)
    except ValueError:
        return None


def _number(value: object) -> Optional[float]:
    parsed = pd.to_numeric(value, errors="coerce")
    return None if pd.isna(parsed) else float(parsed)


def _text(value: object) -> str:
    if pd.isna(value):
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


class TransportProvider(ABC):
    transport_type: str

    def __init__(
        self,
        dataset_path: Path,
        api_enabled: bool = False,
        api_search: Optional[ApiSearch] = None,
        max_results: int = 25,
    ):
        self.dataset_path = dataset_path
        self.api_enabled = api_enabled
        self.api_search = api_search
        self.max_results = max_results
        self._data: Optional[pd.DataFrame] = None

    @abstractmethod
    def _search_dataset(self, source_city: str, destination_city: str) -> List[RouteRecord]:
        raise NotImplementedError

    def search_routes(
        self,
        source_city: str,
        destination_city: str,
        travel_date: datetime,
    ) -> List[RouteRecord]:
        if self.api_enabled and self.api_search is not None:
            api_routes = self.api_search(source_city, destination_city, travel_date)
            if api_routes:
                return self._deduplicate(api_routes)[: self.max_results]
        return self._deduplicate(
            self._search_dataset(source_city, destination_city)
        )[: self.max_results]

    def _load(self) -> pd.DataFrame:
        if self._data is None:
            self._data = pd.read_csv(self.dataset_path) if self.dataset_path.exists() else pd.DataFrame()
            if not self._data.empty:
                for column in ("Source", "Destination"):
                    if column in self._data:
                        self._data[f"__{column.lower()}_city"] = self._data[column].map(normalize_city)
                for column in ("fromStnCode", "toStnCode"):
                    if column in self._data:
                        self._data[f"__{column.lower()}"] = (
                            self._data[column].astype(str).str.strip().str.upper()
                        )
                for column in ("Pickup Location", "Drop Location"):
                    if column in self._data:
                        self._data[f"__{column.lower().replace(' ', '_')}"] = (
                            self._data[column].astype(str).str.strip().str.casefold()
                        )
        return self._data

    @staticmethod
    def _deduplicate(records: List[RouteRecord]) -> List[RouteRecord]:
        unique = []
        seen = set()
        for record in records:
            signature = (
                record.get("Transport_Type"),
                record.get("Mode"),
                record.get("Source"),
                record.get("Destination"),
                record.get("Origin_Code"),
                record.get("Destination_Code"),
                record.get("Dataset_Distance"),
                record.get("Dataset_Price"),
                record.get("Dataset_Duration"),
            )
            if signature not in seen:
                seen.add(signature)
                unique.append(record)
        return unique

    def _record(
        self,
        row_index: object,
        mode: object,
        source: str,
        destination: str,
        distance: object,
        price: object,
        duration: object,
        **metadata: object,
    ) -> RouteRecord:
        return {
            "Transport_Type": self.transport_type,
            "Mode": _text(mode),
            "Source": source,
            "Destination": destination,
            "Dataset_Distance": _number(distance),
            "Dataset_Price": _number(price),
            "Dataset_Duration": parse_duration_minutes(duration),
            "Dataset_Source": self.dataset_path.name,
            "Dataset_Record_ID": str(row_index),
            **metadata,
        }


class FlightProvider(TransportProvider):
    transport_type = "Flight"

    def _search_dataset(self, source_city: str, destination_city: str) -> List[RouteRecord]:
        data = self._load()
        if data.empty:
            return []
        source = normalize_city(source_city)
        destination = normalize_city(destination_city)
        matches = data[
            data["__source_city"].eq(source)
            & data["__destination_city"].eq(destination)
        ]
        return [
            self._record(
                index,
                row.get("Airline"),
                source,
                destination,
                row.get("Distance"),
                row.get("Price"),
                row.get("Duration"),
                Dataset_Date=row.get("Date_of_Journey"),
            )
            for index, row in matches.iterrows()
        ]


class RailProvider(TransportProvider):
    transport_type = "Train"

    def _codes_for(self, city: str) -> set:
        normalized = normalize_city(city)
        return STATION_CODES.get(normalized, {str(city).strip().upper()})

    def _search_dataset(self, source_city: str, destination_city: str) -> List[RouteRecord]:
        data = self._load()
        if data.empty:
            return []
        source = normalize_city(source_city)
        destination = normalize_city(destination_city)
        matches = data[
            data["__fromstncode"].isin(self._codes_for(source))
            & data["__tostncode"].isin(self._codes_for(destination))
        ]
        return [
            self._record(
                index,
                row.get("trainNumber"),
                source,
                destination,
                row.get("distance"),
                row.get("totalFare"),
                row.get("duration"),
                Origin_Code=str(row.get("fromStnCode", "")).strip(),
                Destination_Code=str(row.get("toStnCode", "")).strip(),
                Dataset_Date=row.get("timeStamp"),
            )
            for index, row in matches.iterrows()
        ]


class BusProvider(TransportProvider):
    transport_type = "Bus"

    def _search_dataset(self, source_city: str, destination_city: str) -> List[RouteRecord]:
        data = self._load()
        if data.empty:
            return []
        source = normalize_city(source_city)
        destination = normalize_city(destination_city)
        matches = data[
            data["__source_city"].eq(source)
            & data["__destination_city"].eq(destination)
        ]
        operator_column = next(
            (column for column in ("Operator", "Bus Operator", "Travels", "Mode") if column in data.columns),
            None,
        )
        records = []
        for index, row in matches.iterrows():
            mode = row.get(operator_column) if operator_column else None
            if not _text(mode):
                row_source = normalize_city(row.get("Source"))
                row_destination = normalize_city(row.get("Destination"))
                mode = f"{row_source}-{row_destination} Dataset Bus Route"
            records.append(
                self._record(
                    index,
                    mode,
                    source,
                    destination,
                    row.get("distance"),
                    row.get("price"),
                    row.get("Travel Duration"),
                )
            )
        return records


class LocalCabProvider(TransportProvider):
    transport_type = "Cab"
    HUB_TERMS = {
        "Flight": ("airport",),
        "Train": ("railway", "station"),
        "Bus": ("isbt", "bus"),
    }

    def __init__(self, city: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.city = normalize_city(city)

    def _search_dataset(self, source_city: str, destination_city: str) -> List[RouteRecord]:
        return self.search_local_routes(source_city, destination_city)

    def search_local_routes(self, pickup: str, drop: str) -> List[RouteRecord]:
        data = self._load()
        pickup = str(pickup or "").strip()
        drop = str(drop or "").strip()
        if data.empty or not pickup or not drop:
            return []
        matches = data[
            data["__pickup_location"].eq(pickup.casefold())
            & data["__drop_location"].eq(drop.casefold())
        ]
        records = []
        for index, row in matches.iterrows():
            distance = _number(row.get("Ride Distance"))
            records.append(
                self._record(
                    index,
                    row.get("Vehicle Type"),
                    f"{str(row.get('Pickup Location')).strip()} ({self.city})",
                    f"{str(row.get('Drop Location')).strip()} ({self.city})",
                    distance,
                    row.get("Booking Value"),
                    distance * 4 if distance is not None else None,
                )
            )
        return records[: self.max_results]

    def search_hub_routes(
        self,
        area: str,
        intercity_type: str,
        first_mile: bool,
    ) -> List[RouteRecord]:
        data = self._load()
        area = str(area or "").strip()
        terms = self.HUB_TERMS.get(intercity_type, ())
        if data.empty or not area or not terms:
            return []
        pickup = data["__pickup_location"]
        drop = data["__drop_location"]
        hub_values = drop if first_mile else pickup
        area_values = pickup if first_mile else drop
        hub_mask = pd.Series(False, index=data.index)
        for term in terms:
            hub_mask |= hub_values.str.contains(term, regex=False)
        matches = data[area_values.eq(area.casefold()) & hub_mask]
        records = []
        for index, row in matches.iterrows():
            distance = _number(row.get("Ride Distance"))
            records.append(
                self._record(
                    index,
                    row.get("Vehicle Type"),
                    f"{str(row.get('Pickup Location')).strip()} ({self.city})",
                    f"{str(row.get('Drop Location')).strip()} ({self.city})",
                    distance,
                    row.get("Booking Value"),
                    distance * 4 if distance is not None else None,
                )
            )
        return records[: self.max_results]


class DatasetRouteProvider:
    FILES = {
        "flight": "finalairways.csv",
        "rail": "finalrailways.csv",
        "bus": "intercitybuses.csv",
        "Delhi": "finaldelhiroadways.csv",
        "Bangalore": "finalbangloreroadways.csv",
    }

    def __init__(
        self,
        data_dir: Path,
        enable_rail_api: bool = False,
        enable_flight_api: bool = False,
        enable_bus_api: bool = False,
        api_searchers: Optional[Dict[str, ApiSearch]] = None,
    ):
        self.dataset_dir = self._find_dataset_dir(Path(data_dir))
        searchers = api_searchers or {}
        self.rail_provider = RailProvider(
            self.dataset_dir / self.FILES["rail"], enable_rail_api, searchers.get("rail")
        )
        self.flight_provider = FlightProvider(
            self.dataset_dir / self.FILES["flight"], enable_flight_api, searchers.get("flight")
        )
        self.bus_provider = BusProvider(
            self.dataset_dir / self.FILES["bus"], enable_bus_api, searchers.get("bus")
        )
        self.local_providers = {
            city: LocalCabProvider(city, self.dataset_dir / filename)
            for city, filename in self.FILES.items()
            if city not in {"flight", "rail", "bus"}
        }
        self._locations_cache = {}

    @classmethod
    def _find_dataset_dir(cls, data_dir: Path) -> Path:
        data_dir = data_dir.resolve()
        configured = os.getenv("TRANSPORT_DATASET_DIR")
        candidates = [
            Path(configured) if configured else None,
            data_dir / "datasets",
            data_dir,
        ]
        required = {cls.FILES["flight"], cls.FILES["rail"], cls.FILES["bus"]}
        for candidate in candidates:
            if candidate and required.issubset({path.name for path in candidate.glob("*.csv")}):
                return candidate
        return data_dir / "datasets"

    def search_routes(
        self, source_city: str, destination_city: str, travel_date: datetime
    ) -> List[RouteRecord]:
        print("dataset_provider.search_routes() received:", source_city, destination_city)
        routes = []
        routes.extend(self.rail_provider.search_routes(source_city, destination_city, travel_date))
        routes.extend(self.flight_provider.search_routes(source_city, destination_city, travel_date))
        routes.extend(self.bus_provider.search_routes(source_city, destination_city, travel_date))
        return routes

    def available_cities(self) -> List[str]:
        cities = set(STATION_CODES)
        for provider in (self.flight_provider, self.bus_provider):
            data = provider._load()
            if not data.empty:
                cities.update(data["__source_city"].dropna().tolist())
                cities.update(data["__destination_city"].dropna().tolist())
        return sorted(city for city in cities if city)

    def get_intracity_locations(self, city: str) -> List[str]:
        norm = normalize_city(city)
        if norm in self._locations_cache:
            return self._locations_cache[norm]
        provider = self.local_providers.get(norm)
        if not provider:
            return []
        data = provider._load()
        if data.empty:
            return []
        pickups = data["Pickup Location"].dropna().unique().tolist()
        drops = data["Drop Location"].dropna().unique().tolist()
        locations = sorted(list(set(pickups).union(set(drops))))
        self._locations_cache[norm] = locations
        return locations

    def search_local_cabs(self, city: str, pickup: str, drop: str) -> List[RouteRecord]:
        provider = self.local_providers.get(normalize_city(city))
        return provider.search_local_routes(pickup, drop) if provider else []

    def search_access_cabs(
        self,
        city: str,
        area: str,
        intercity_type: str,
        first_mile: bool,
    ) -> List[RouteRecord]:
        provider = self.local_providers.get(normalize_city(city))
        return provider.search_hub_routes(area, intercity_type, first_mile) if provider else []
