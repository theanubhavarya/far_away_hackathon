from fastapi import APIRouter, Query

from app.schemas import DisruptionEvent, PlanRouteResponse
from app.services.route_service import demo_plan, disruption

router = APIRouter(prefix="/api/v1/demo", tags=["demo"])


@router.post("/trigger-disruption", response_model=DisruptionEvent)
def trigger(route_id: str | None = Query(default=None)):
    return disruption(route_id)


@router.get("/preload", response_model=PlanRouteResponse)
def preload():
    return demo_plan()
