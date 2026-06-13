from app.schemas.agent_schemas import AgentInfo
from app.schemas.group_schemas import GroupPayload, GroupTrip
from app.schemas.route_schemas import (
    AccessibilityInfo,
    CitySearchResult,
    CostBreakdown,
    DisruptionEvent,
    DownstreamEffect,
    PlanRouteRequest,
    PlanRouteResponse,
    RouteOption,
    RouteSegment,
    Stop,
    TravelerConfig,
    LegOption,
    IntracityLocationsResponse,
)
from app.schemas.trip_schemas import BookingConfirmation, BookingPayload

TripRequest = PlanRouteRequest
