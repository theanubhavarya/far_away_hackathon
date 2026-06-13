from app.core.data import CITY_DATA
from app.schemas import CitySearchResult


def search_cities(q: str) -> list[CitySearchResult]:
    needle = (q or "").strip().lower()
    results = []
    for name, (station, code, airport, lat, lon) in CITY_DATA.items():
        haystack = f"{name} {station} {code} {airport}".lower()
        if not needle or needle in haystack:
            results.append(
                CitySearchResult(
                    name=name,
                    station=station,
                    code=code,
                    airport=airport,
                    lat=lat,
                    lon=lon,
                    display=f"{name} ({code})",
                )
            )
    return results[:12]
