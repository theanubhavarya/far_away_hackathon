from __future__ import annotations

import time
from datetime import datetime, timezone

from app.ml.adapter import assign_tags, build_route_option
from app.ml.engine import load_engine
from app.schemas import DisruptionEvent, DownstreamEffect, PlanRouteResponse, RouteOption, TripRequest
from app.utils.helpers import clean_city, new_id


PREFERENCE_MAP = {
    "FASTEST": "Fastest",
    "ECONOMIC": "Economical",
    "MAX_COMFORT": "Luxury",
    "BALANCED": "Balanced",
    "ECO": "Eco",
}

ROUTE_STORE: dict[str, RouteOption] = {}
LAST_REQUEST: TripRequest | None = None


def plan_routes(request: TripRequest, limit: int = 7) -> PlanRouteResponse:
    global LAST_REQUEST
    started = time.perf_counter()
    preference = PREFERENCE_MAP.get(request.mode, "Economical")

    from app.schemas.route_schemas import LegOption, RouteOption
    from app.schemas import CostBreakdown

    if request.return_date:
        # Outbound Leg
        outbound_scored = load_engine().get_all_scored_routes(
            request.origin,
            request.destination,
            request.travel_date,
            preference,
            pickup_area=request.pickup_area or "",
            drop_area=request.drop_area or "",
        )
        outbound_routes = [
            build_route_option(item, request.travel_date, index, request.accessibility, request.travelers.bags)
            for index, item in enumerate(outbound_scored[:limit])
        ]

        # Return Leg
        return_scored = load_engine().get_all_scored_routes(
            request.destination,
            request.origin,
            request.return_date,
            preference,
            pickup_area=request.drop_area or "",
            drop_area=request.pickup_area or "",
        )
        return_routes = [
            build_route_option(item, request.return_date, index, request.accessibility, request.travelers.bags)
            for index, item in enumerate(return_scored[:limit])
        ]

        # Apply pricing to both outbound and return routes
        import sys
        from pathlib import Path
        backend_dir = str(Path(__file__).resolve().parents[2])
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        from services.pricing_service import apply_pricing_to_route

        for route in outbound_routes:
            apply_pricing_to_route(route, request.travelers)
        for route in return_routes:
            apply_pricing_to_route(route, request.travelers)

        # Pair outbound and return routes index-to-index
        routes = []
        for i in range(min(len(outbound_routes), len(return_routes))):
            out_r = outbound_routes[i]
            ret_r = return_routes[i]

            outbound_leg = LegOption(
                segments=out_r.segments,
                total_time_minutes=out_r.total_time_minutes,
                total_cost_inr=out_r.total_cost_inr,
                cost_breakdown=out_r.cost_breakdown,
                departure_time=out_r.departure_time,
                arrival_time=out_r.arrival_time,
                fare_per_person=out_r.fare_per_person,
                total_fare=out_r.total_fare
            )

            return_leg = LegOption(
                segments=ret_r.segments,
                total_time_minutes=ret_r.total_time_minutes,
                total_cost_inr=ret_r.total_cost_inr,
                cost_breakdown=ret_r.cost_breakdown,
                departure_time=ret_r.departure_time,
                arrival_time=ret_r.arrival_time,
                fare_per_person=ret_r.fare_per_person,
                total_fare=ret_r.total_fare
            )

            combined_segments = out_r.segments + ret_r.segments
            combined_time = out_r.total_time_minutes + ret_r.total_time_minutes
            combined_cost = out_r.total_cost_inr + ret_r.total_cost_inr
            combined_carbon = out_r.carbon_grams + ret_r.carbon_grams
            combined_comfort = round((out_r.comfort_score + ret_r.comfort_score) / 2, 1)
            combined_reliability = round((out_r.reliability_score + ret_r.reliability_score) / 2, 2)

            combined_breakdown = CostBreakdown(
                transport_total_inr=out_r.cost_breakdown.transport_total_inr + ret_r.cost_breakdown.transport_total_inr,
                estimated_local_cab_inr=out_r.cost_breakdown.estimated_local_cab_inr + ret_r.cost_breakdown.estimated_local_cab_inr,
                estimated_food_inr=out_r.cost_breakdown.estimated_food_inr + ret_r.cost_breakdown.estimated_food_inr,
                optional_fees_inr=out_r.cost_breakdown.optional_fees_inr + ret_r.cost_breakdown.optional_fees_inr,
                total_min_inr=out_r.cost_breakdown.total_min_inr + ret_r.cost_breakdown.total_min_inr,
                total_max_inr=out_r.cost_breakdown.total_max_inr + ret_r.cost_breakdown.total_max_inr,
                segment_breakdown={**out_r.cost_breakdown.segment_breakdown, **ret_r.cost_breakdown.segment_breakdown}
            )

            travellers = out_r.travellers
            total_fare = (out_r.total_fare or out_r.total_cost_inr) + (ret_r.total_fare or ret_r.total_cost_inr)
            fare_per_person = round(total_fare / travellers, 2) if travellers else total_fare

            combined_route = RouteOption(
                route_id=new_id("route"),
                trip_type="round_trip",
                outbound=outbound_leg,
                return_leg=return_leg,
                segments=combined_segments,
                total_time_minutes=combined_time,
                total_cost_inr=combined_cost,
                cost_breakdown=combined_breakdown,
                comfort_score=combined_comfort,
                reliability_score=combined_reliability,
                carbon_grams=combined_carbon,
                tags=list(set(out_r.tags + ret_r.tags)),
                departure_time=out_r.departure_time,
                arrival_time=ret_r.arrival_time,
                fare_per_person=fare_per_person,
                total_fare=total_fare,
                travellers=travellers
            )
            routes.append(combined_route)

        if request.mode == "ECO":
            routes.sort(key=lambda route: route.carbon_grams)
        routes = assign_tags(routes)

    else:
        # One-Way flow (outbound only)
        scored = load_engine().get_all_scored_routes(
            request.origin,
            request.destination,
            request.travel_date,
            preference,
            pickup_area=request.pickup_area or "",
            drop_area=request.drop_area or "",
        )
        routes = [
            build_route_option(item, request.travel_date, index, request.accessibility, request.travelers.bags)
            for index, item in enumerate(scored[:limit])
        ]
        if request.mode == "ECO":
            routes.sort(key=lambda route: route.carbon_grams)
        routes = assign_tags(routes)

        # Import and apply traveler-based pricing layer
        import sys
        from pathlib import Path
        backend_dir = str(Path(__file__).resolve().parents[2])
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        from services.pricing_service import apply_pricing_to_route
        for route in routes:
            apply_pricing_to_route(route, request.travelers)

        # Build LegOption mapping for backward compatibility
        for route in routes:
            route.trip_type = "one_way"
            route.outbound = LegOption(
                segments=route.segments,
                total_time_minutes=route.total_time_minutes,
                total_cost_inr=route.total_cost_inr,
                cost_breakdown=route.cost_breakdown,
                departure_time=route.departure_time,
                arrival_time=route.arrival_time,
                fare_per_person=route.fare_per_person,
                total_fare=route.total_fare
            )
            route.return_leg = None

    for route in routes:
        ROUTE_STORE[route.route_id] = route
    LAST_REQUEST = request
    return PlanRouteResponse(
        request_id=new_id("req"),
        origin=clean_city(request.origin),
        destination=clean_city(request.destination),
        travel_date=request.travel_date,
        routes=routes,
        planning_time_ms=int((time.perf_counter() - started) * 1000),
        agents_used=["Orchestrator", "Routing Agent", "Pricing Agent", "Accessibility Agent"],
    )


def get_route(route_id: str) -> RouteOption | None:
    return ROUTE_STORE.get(route_id)


def demo_plan() -> PlanRouteResponse:
    request = TripRequest(
        origin="Delhi",
        destination="Bangalore",
        travel_date=datetime.now().date().isoformat(),
        travelers={"adults": 1, "children": 0, "seniors": 0, "pwd": 0, "bags": 1},
        mode="ECONOMIC",
        accessibility=False,
    )
    return plan_routes(request)


def disruption(route_id: str | None = None, scenario_id: str = "train_delay_2h") -> DisruptionEvent:
    affected_route = ROUTE_STORE.get(route_id or "") or next(iter(ROUTE_STORE.values()), None)
    alternatives: list[RouteOption]
    if LAST_REQUEST:
        alt_request = LAST_REQUEST.copy(update={"mode": "FASTEST"})
        alternatives = [r for r in plan_routes(alt_request, limit=4).routes if r.route_id != route_id]
    else:
        alternatives = demo_plan().routes[:3]
    affected_id = route_id or (affected_route.route_id if affected_route else alternatives[0].route_id)
    return DisruptionEvent(
        disruption_id=new_id("disruption"),
        affected_train="primary intercity leg",
        delay_minutes=120 if scenario_id == "train_delay_2h" else 75,
        reason="Operational delay reported by the disruption simulator",
        affected_route_id=affected_id,
        cascade_effects=[
            DownstreamEffect(type="connection", description="Connection buffer reduced at next transfer", cost_delta=0),
            DownstreamEffect(type="cab", description="Later arrival may increase local cab fare", cost_delta=180),
        ],
        alternative_routes=alternatives[:3],
        triggered_at=datetime.now(timezone.utc).isoformat(),
    )


def get_intracity_locations(city: str) -> dict:
    return load_engine().recommender.dataset_provider.get_intracity_locations(city)
