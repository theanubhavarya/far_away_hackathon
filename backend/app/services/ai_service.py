import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.schemas.group_schemas import GroupPayload, GroupTrip
from app.schemas.route_schemas import (
    CitySearchResult,
    DisruptionEvent,
    PlanRouteRequest,
    PlanRouteResponse,
    RouteOption,
)
from app.schemas.trip_schemas import BookingConfirmation, BookingPayload
from app.core.config import ENABLE_BUS_API, ENABLE_FLIGHT_API, ENABLE_RAIL_API
from app.services.agent_manager import AgentManager
from app.services import route_service
from recommend import RouteRecommender


class AIService:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.recommender = RouteRecommender(
            str(data_dir),
            enable_rail_api=ENABLE_RAIL_API,
            enable_flight_api=ENABLE_FLIGHT_API,
            enable_bus_api=ENABLE_BUS_API,
        )
        self.agent_manager = AgentManager()
        self.route_store: Dict[str, Dict[str, Any]] = {}
        self.trip_store: Dict[str, BookingConfirmation] = {}
        self.group_store: Dict[str, Dict[str, Any]] = {}
        self.city_catalog = self._build_city_catalog()

    def _build_city_catalog(self) -> List[CitySearchResult]:
        from app.core.data import CITY_DATA, ALIASES
        from route_providers import CITY_ALIASES

        raw_cities = self.recommender.dataset_provider.available_cities()
        results = []
        for city in raw_cities:
            # Resolve aliases
            normalized_name = city
            folded = city.lower()
            if folded in CITY_ALIASES:
                normalized_name = CITY_ALIASES[folded]
            elif folded in ALIASES:
                normalized_name = ALIASES[folded]
            else:
                normalized_name = city.title()

            info = CITY_DATA.get(normalized_name)
            if info:
                station, code, airport, lat, lon = info
            else:
                station = f"{city} Central Station"
                code = city[:3].upper()
                airport = f"{city} International Airport"
                lat = 20.5937
                lon = 78.9629

            results.append(CitySearchResult(
                name=city,
                station=station,
                code=code,
                airport=airport,
                lat=lat,
                lon=lon,
                display=f'{city} · {airport}',
            ))
        return results

    def search_cities(self, query: str) -> List[CitySearchResult]:
        if not query:
            return self.city_catalog[:10]
        lowercase = query.strip().lower()
        return [city for city in self.city_catalog if lowercase in city.name.lower()][:10]

    def get_intracity_locations(self, city: str) -> Dict[str, Any]:
        locations = self.recommender.dataset_provider.get_intracity_locations(city)
        return {'city': city, 'locations': locations}

    def plan_routes(self, request: PlanRouteRequest) -> PlanRouteResponse:
        response = route_service.plan_routes(request, limit=5)
        for route in response.routes:
            self.route_store[route.route_id] = {
                'route_option': route,
                'origin': request.origin,
                'destination': request.destination,
                'travel_date': request.travel_date,
                'mode': request.mode,
                'accessibility': request.accessibility,
                'detour_city': request.detour_city,
                'segments': route.segments,
                'travelers': request.travelers,
            }
        return response

    def get_route(self, route_id: str) -> RouteOption:
        stored = self.route_store.get(route_id)
        if stored:
            return stored['route_option']
        route = route_service.get_route(route_id)
        if route is None:
            raise KeyError('route not found')
        return route

    def replan_route(self, route_id: str, scenario_id: Optional[str] = None) -> DisruptionEvent:
        existing = self.route_store.get(route_id)
        if not existing and route_service.get_route(route_id) is None:
            raise KeyError('route not found')
        if not existing:
            return route_service.disruption(route_id, scenario_id or 'train_delay_2h')
        travelers_config = existing.get('travelers') or {'adults': 1, 'children': 0, 'seniors': 0, 'pwd': 0, 'bags': 1}
        request = PlanRouteRequest(
            origin=existing['origin'],
            destination=existing['destination'],
            travel_date=existing['travel_date'],
            travelers=travelers_config,
            mode=existing['mode'],
            accessibility=existing['accessibility'],
            detour_city=existing['detour_city'],
        )
        plan = self.plan_routes(request)
        alternatives = [route for route in plan.routes if route.route_id != route_id][:3]
        if not alternatives and plan.routes:
            alternatives = plan.routes[:3]
        affected_train = next((seg.operator for seg in self.route_store[route_id]['segments'] if seg.class_type != 'Cab'), 'Local service')
        delay = 45
        cascade = [
            {'type': 'delay', 'description': 'Ticket change and rebooking overhead', 'cost_delta': 150},
            {'type': 'hotel', 'description': 'Extra layover costs for disrupted journey', 'cost_delta': 250},
        ]
        event = DisruptionEvent(
            disruption_id=str(uuid.uuid4()),
            affected_train=affected_train,
            delay_minutes=delay,
            reason=f'{affected_train} experienced an unexpected operational delay.',
            affected_route_id=route_id,
            cascade_effects=cascade,
            alternative_routes=alternatives,
            triggered_at=datetime.utcnow().isoformat() + 'Z',
        )
        return event

    def create_booking(self, payload: BookingPayload) -> BookingConfirmation:
        route_option = self.route_store.get(payload.route_id)
        if not route_option:
            raise KeyError('route not found')
        booking_id = str(uuid.uuid4())
        ref = f'YATRI-{booking_id[:8].upper()}'
        confirmation = BookingConfirmation(
            booking_id=booking_id,
            booking_ref=ref,
            route_id=payload.route_id,
            traveler_name=payload.traveler_name,
            total_paid_inr=self.route_store[payload.route_id]['route_option'].total_cost_inr,
            status='CONFIRMED',
            segments_confirmed=[
                {
                    'segment': segment.segment_id,
                    'origin': segment.origin_stop['city'],
                    'destination': segment.destination_stop['city'],
                    'mode': segment.mode,
                }
                for segment in self.route_store[payload.route_id]['route_option'].segments
            ],
            created_at=datetime.utcnow().isoformat() + 'Z',
        )
        self.trip_store[booking_id] = confirmation
        return confirmation

    def get_booking(self, trip_id: str) -> BookingConfirmation:
        if trip_id not in self.trip_store:
            raise KeyError('trip not found')
        return self.trip_store[trip_id]

    def create_group(self, payload: GroupPayload) -> GroupTrip:
        group_id = str(uuid.uuid4())
        votes = {destination: 0 for destination in (payload.destination_options or [])}
        trip = {
            'group_id': group_id,
            'group_name': payload.group_name,
            'members': payload.members,
            'destination_votes': votes,
            'budget_per_person': payload.budget_per_person,
            'total_budget': payload.budget_per_person * max(len(payload.members), 1),
            'status': 'PENDING',
        }
        self.group_store[group_id] = trip
        return GroupTrip(**trip)

    def vote_destination(self, group_id: str, destination: str, member: str) -> Dict[str, int]:
        group = self.group_store.get(group_id)
        if not group:
            raise KeyError('group not found')
        if destination not in group['destination_votes']:
            group['destination_votes'][destination] = 0
        group['destination_votes'][destination] += 1
        group['status'] = 'DECIDING'
        top_dest = max(group['destination_votes'].items(), key=lambda item: item[1])[0]
        self.recommender.generate_candidates('Delhi', top_dest, '', '', datetime.utcnow())
        group['status'] = 'VOTING'
        return group['destination_votes']

    def get_agent_status(self) -> List[Dict[str, Any]]:
        return [agent.__dict__ for agent in self.agent_manager.list()]

    def preload_demo(self) -> PlanRouteResponse:
        demo_request = PlanRouteRequest(
            origin='Delhi',
            destination='Bangalore',
            travel_date=datetime.utcnow().date().isoformat(),
            travelers={'adults': 2, 'children': 0, 'seniors': 0, 'pwd': 0, 'bags': 2},
            mode='ECONOMIC',
            accessibility=False,
            detour_city=None,
        )
        return self.plan_routes(demo_request)
