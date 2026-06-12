from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel

class AccessibilityInfo(BaseModel):
    has_elevator: Optional[bool] = False
    has_escalator: Optional[bool] = False
    ac_waiting_room: Optional[bool] = False
    wheelchair_ramps: Optional[bool] = False
    medical_nearby: Optional[str] = None
    step_free_route: Optional[bool] = False
    walking_distance_meters: Optional[int] = 0

class Stop(BaseModel):
    city: str
    station_name: str
    station_code: str
    latitude: float
    longitude: float
    terminal_info: str
    accessibility: Optional[AccessibilityInfo] = None

class RouteSegment(BaseModel):
    segment_id: str
    origin_stop: Stop
    destination_stop: Stop
    mode: str
    operator: str
    class_type: str
    departure_time: str
    arrival_time: str
    duration_minutes: int
    fare_inr: int
    platform_info: str
    accessibility_info: Optional[AccessibilityInfo] = None
    carbon_grams: int

class CostBreakdown(BaseModel):
    transport_total_inr: int
    estimated_local_cab_inr: int
    estimated_food_inr: int
    optional_fees_inr: int
    total_min_inr: int
    total_max_inr: int
    segment_breakdown: Dict[str, int]

class LegOption(BaseModel):
    segments: List[RouteSegment]
    total_time_minutes: int
    total_cost_inr: int
    cost_breakdown: CostBreakdown
    departure_time: str
    arrival_time: str
    fare_per_person: Optional[float] = None
    total_fare: Optional[int] = None

class RouteOption(BaseModel):
    route_id: str
    trip_type: str = "one_way"
    outbound: Optional[LegOption] = None
    return_leg: Optional[LegOption] = None
    segments: List[RouteSegment]
    total_time_minutes: int
    total_cost_inr: int
    cost_breakdown: CostBreakdown
    comfort_score: float
    reliability_score: float
    carbon_grams: int
    tags: List[str]
    departure_time: str
    arrival_time: str
    fare_per_person: Optional[float] = None
    total_fare: Optional[int] = None
    travellers: Optional[int] = None

class TravelerConfig(BaseModel):
    adults: int
    children: int
    seniors: int
    pwd: int
    bags: int

class PlanRouteRequest(BaseModel):
    origin: str
    destination: str
    travel_date: str
    return_date: Optional[str] = None
    travelers: TravelerConfig
    mode: str
    accessibility: bool
    detour_city: Optional[str] = None
    city: Optional[str] = None
    pickup_area: Optional[str] = None
    drop_area: Optional[str] = None

class IntracityLocationsResponse(BaseModel):
    city: str
    locations: List[str]

class PlanRouteResponse(BaseModel):
    request_id: str
    origin: str
    destination: str
    travel_date: str
    routes: List[RouteOption]
    planning_time_ms: int
    agents_used: List[str]

class DownstreamEffect(BaseModel):
    type: str
    description: str
    cost_delta: int

class DisruptionEvent(BaseModel):
    disruption_id: str
    affected_train: str
    delay_minutes: int
    reason: str
    affected_route_id: str
    cascade_effects: List[DownstreamEffect]
    alternative_routes: List[RouteOption]
    triggered_at: str

class CitySearchResult(BaseModel):
    name: str
    station: str
    code: str
    airport: str
    lat: float
    lon: float
    display: str
