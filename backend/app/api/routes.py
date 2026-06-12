from fastapi import APIRouter, HTTPException, Query

from app.schemas import DisruptionEvent, PlanRouteResponse, RouteOption, TripRequest
from app.services.route_service import disruption, get_route, plan_routes

router = APIRouter(prefix="/api/v1/routes", tags=["routes"])


@router.post("/plan", response_model=PlanRouteResponse)
def plan(request: TripRequest):
    return plan_routes(request)


@router.get("/{route_id}", response_model=RouteOption)
def by_id(route_id: str):
    route = get_route(route_id)
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")
    return route


@router.post("/{route_id}/replan", response_model=DisruptionEvent)
def replan(route_id: str, scenario_id: str = Query(default="train_delay_2h")):
    return disruption(route_id, scenario_id)
