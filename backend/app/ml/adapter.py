from __future__ import annotations

from datetime import datetime

from app.core.data import CARBON_PER_MINUTE, CITY_DATA, TRANSPORT_RELIABILITY
from app.schemas import AccessibilityInfo, CostBreakdown, RouteOption, RouteSegment, Stop
from app.utils.helpers import clean_city, display_time, new_id, plus_minutes


TYPE_TO_MODE = {"Flight": "flight", "Train": "train", "Bus": "bus", "Cab": "cab"}


def accessibility_info() -> AccessibilityInfo:
    return AccessibilityInfo(
        has_elevator=True,
        has_escalator=True,
        ac_waiting_room=True,
        wheelchair_ramps=True,
        medical_nearby="Station first-aid desk",
        step_free_route=True,
        walking_distance_meters=120,
    )


def stop_from_name(name: str, transport_type: str, accessible: bool) -> Stop:
    city = clean_city(name)
    
    import re
    parent_city = None
    m = re.search(r"\(([^)]+)\)", name)
    if m:
        parent_city = clean_city(m.group(1).strip())
        
    lookup_city = parent_city if parent_city in CITY_DATA else city
    
    station, code, airport, lat, lon = CITY_DATA.get(
        lookup_city, (f"{city} Transit Hub", city[:3].upper() or "HUB", f"{city} Airport", 20.5937, 78.9629)
    )
    if transport_type == "Flight":
        station_name = airport
        station_code = f"{code}A"
    elif transport_type == "Bus":
        station_name = f"{city} ISBT"
        station_code = f"{code}B"
    elif transport_type == "Cab":
        station_name = name
        station_code = f"{(city[:3].upper() or 'CAB')}C"
    else:
        station_name = station
        station_code = code
    return Stop(
        city=city,
        station_name=station_name,
        station_code=station_code,
        latitude=lat,
        longitude=lon,
        terminal_info=airport if transport_type == "Flight" else "",
        accessibility=accessibility_info() if accessible else None,
    )


def class_type(transport_type: str, operator: str) -> str:
    if transport_type == "Flight":
        return "Economy"
    if transport_type == "Train":
        return "AC Chair Car" if "Shatabdi" in operator else "Sleeper"
    if transport_type == "Bus":
        return "AC Seater"
    if "Premier" in operator:
        return "Premium"
    return "Standard"


def platform_info(transport_type: str, index: int) -> str:
    if transport_type == "Flight":
        return f"Terminal {1 + index % 2}, Gate {20 + index}"
    if transport_type == "Train":
        return f"Platform {2 + index}"
    if transport_type == "Bus":
        return f"Bay {4 + index}"
    return "Driver pickup point confirmed"


def segment_carbon(mode: str, minutes: int) -> int:
    return int(CARBON_PER_MINUTE.get(mode, 200) * max(minutes, 1))


def cost_breakdown(segments: list[RouteSegment], bags: int) -> CostBreakdown:
    transport_total = sum(s.fare_inr for s in segments)
    local_cab = 250 if not any(s.mode == "cab" for s in segments) else 0
    food = max(120, len(segments) * 150)
    fees = max(0, bags - 1) * 250
    total_min = transport_total + local_cab + food + fees
    total_max = total_min + max(300, int(transport_total * 0.08))
    return CostBreakdown(
        transport_total_inr=transport_total,
        estimated_local_cab_inr=local_cab,
        estimated_food_inr=food,
        optional_fees_inr=fees,
        total_min_inr=total_min,
        total_max_inr=total_max,
        segment_breakdown={s.segment_id: s.fare_inr for s in segments},
    )


def build_route_option(scored: dict, travel_date: str, index: int, accessible: bool, bags: int) -> RouteOption:
    cursor = datetime.strptime(f"{travel_date} {6 + index:02d}:00", "%Y-%m-%d %H:%M")
    segments: list[RouteSegment] = []

    for segment_index, leg in enumerate(scored["route"]):
        transport_type = leg["Transport_Type"]
        mode = TYPE_TO_MODE.get(transport_type, "bus")
        duration = int(round(float(leg["Duration"])))
        departure = cursor
        arrival = plus_minutes(departure, duration)
        carbon = segment_carbon(mode, duration)
        segment = RouteSegment(
            segment_id=new_id("seg"),
            origin_stop=stop_from_name(leg["Source"], transport_type, accessible),
            destination_stop=stop_from_name(leg["Destination"], transport_type, accessible),
            mode=mode,
            operator=str(leg["Mode"]),
            class_type=class_type(transport_type, str(leg["Mode"])),
            departure_time=display_time(departure),
            arrival_time=display_time(arrival),
            duration_minutes=duration,
            fare_inr=int(round(float(leg["Price"]))),
            platform_info=platform_info(transport_type, segment_index),
            accessibility_info=accessibility_info() if accessible else None,
            carbon_grams=carbon,
        )
        segments.append(segment)
        cursor = plus_minutes(arrival, 25 if segment_index < len(scored["route"]) - 1 else 0)

    total_time = int(round(float(scored["total_duration"])))
    total_cost = int(round(float(scored["total_price"])))
    reliability = sum(TRANSPORT_RELIABILITY.get(s.mode, 0.82) for s in segments) / len(segments)
    route = RouteOption(
        route_id=new_id("route"),
        segments=segments,
        total_time_minutes=total_time,
        total_cost_inr=total_cost,
        cost_breakdown=cost_breakdown(segments, bags),
        comfort_score=round(min(5.0, float(scored["avg_comfort"]) * 5), 1),
        reliability_score=round(reliability, 2),
        carbon_grams=sum(s.carbon_grams for s in segments),
        tags=[],
        departure_time=segments[0].departure_time,
        arrival_time=segments[-1].arrival_time,
    )
    return route


def assign_tags(routes: list[RouteOption]) -> list[RouteOption]:
    if not routes:
        return routes
    routes[0].tags.append("RECOMMENDED")
    min_cost = min(routes, key=lambda r: r.total_cost_inr)
    min_time = min(routes, key=lambda r: r.total_time_minutes)
    min_carbon = min(routes, key=lambda r: r.carbon_grams)
    max_comfort = max(routes, key=lambda r: r.comfort_score)
    for route, tag in (
        (min_cost, "BEST_VALUE"),
        (min_time, "FASTEST"),
        (min_carbon, "LOWEST_CARBON"),
        (max_comfort, "MOST_COMFORTABLE"),
    ):
        if tag not in route.tags:
            route.tags.append(tag)
    return routes
