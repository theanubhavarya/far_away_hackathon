from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect

from app.schemas.group_schemas import GroupPayload
from app.schemas.route_schemas import (
    CitySearchResult,
    DisruptionEvent,
    PlanRouteRequest,
    PlanRouteResponse,
    RouteOption,
    IntracityLocationsResponse,
)
from app.schemas.trip_schemas import BookingConfirmation, BookingPayload
from app.services.ai_service import AIService
from app.websocket.agent_stream import ConnectionManager

router = APIRouter()
ws_router = APIRouter()


def get_ai_service(request: Request) -> AIService:
    return request.app.state.ai_service


def get_ws_manager(request: Request) -> ConnectionManager:
    return request.app.state.ws_manager


@router.get('/cities/search', response_model=List[CitySearchResult])
async def search_cities(q: Optional[str] = Query('', description='Search query'), ai_service: AIService = Depends(get_ai_service)):
    return ai_service.search_cities(q)


@router.get('/intracity/locations', response_model=IntracityLocationsResponse)
async def get_intracity_locations(city: str, ai_service: AIService = Depends(get_ai_service)):
    return ai_service.get_intracity_locations(city)


@router.post('/routes/plan', response_model=PlanRouteResponse)
async def plan_routes(request_body: PlanRouteRequest, ai_service: AIService = Depends(get_ai_service), ws_manager: ConnectionManager = Depends(get_ws_manager)):
    await ws_manager.broadcast({'type': 'agent', 'agent': 'Routing Agent', 'status': 'thinking', 'message': 'Generating candidate routes.'})
    response = ai_service.plan_routes(request_body)
    await ws_manager.broadcast({'type': 'agent', 'agent': 'Optimization Agent', 'status': 'complete', 'message': 'AI ranked route options.'})
    return response


@router.get('/routes/{route_id}', response_model=RouteOption)
async def get_route(route_id: str, ai_service: AIService = Depends(get_ai_service)):
    try:
        return ai_service.get_route(route_id)
    except KeyError:
        raise HTTPException(status_code=404, detail='Route not found')


@router.post('/routes/{route_id}/replan', response_model=DisruptionEvent)
async def replan_route(route_id: str, scenario_id: Optional[str] = Query(None), ai_service: AIService = Depends(get_ai_service), ws_manager: ConnectionManager = Depends(get_ws_manager)):
    await ws_manager.broadcast({'type': 'agent', 'agent': 'Disruption Agent', 'status': 'thinking', 'message': 'Replanning due to disruption.'})
    try:
        event = ai_service.replan_route(route_id, scenario_id)
    except KeyError:
        raise HTTPException(status_code=404, detail='Route not found')
    await ws_manager.broadcast({'type': 'agent', 'agent': 'Disruption Agent', 'status': 'complete', 'message': 'Alternative route selected by AI.'})
    return event


@router.post('/trips', response_model=BookingConfirmation)
async def create_trip(payload: BookingPayload, ai_service: AIService = Depends(get_ai_service)):
    try:
        return ai_service.create_booking(payload)
    except KeyError:
        raise HTTPException(status_code=404, detail='Route not found')


@router.get('/trips/{trip_id}', response_model=BookingConfirmation)
async def get_trip(trip_id: str, ai_service: AIService = Depends(get_ai_service)):
    try:
        return ai_service.get_booking(trip_id)
    except KeyError:
        raise HTTPException(status_code=404, detail='Booking not found')


@router.post('/groups', response_model=GroupPayload)
async def create_group(payload: GroupPayload, ai_service: AIService = Depends(get_ai_service)):
    return ai_service.create_group(payload)


@router.post('/groups/{group_id}/vote')
async def vote_destination(group_id: str, destination: str = Query(...), member: str = Query(...), ai_service: AIService = Depends(get_ai_service)):
    try:
        votes = ai_service.vote_destination(group_id, destination, member)
    except KeyError:
        raise HTTPException(status_code=404, detail='Group not found')
    return {'votes': votes}


@router.get('/demo/preload', response_model=PlanRouteResponse)
async def preload_demo(ai_service: AIService = Depends(get_ai_service)):
    return ai_service.preload_demo()


@router.post('/demo/trigger-disruption', response_model=DisruptionEvent)
async def trigger_disruption(route_id: Optional[str] = Query(None), ai_service: AIService = Depends(get_ai_service)):
    if not route_id:
        raise HTTPException(status_code=400, detail='route_id is required for demo disruption')
    try:
        return ai_service.replan_route(route_id)
    except KeyError:
        raise HTTPException(status_code=404, detail='Route not found')


@router.get('/agents/status')
async def get_agents_status(ai_service: AIService = Depends(get_ai_service)):
    return {'agents': ai_service.get_agent_status()}


@ws_router.websocket('/ws/agent-stream')
async def agent_stream(websocket: WebSocket, session_id: Optional[str] = Query(None), ws_manager: ConnectionManager = Depends(get_ws_manager)):
    await ws_manager.connect(websocket)
    try:
        await ws_manager.broadcast({'type': 'session', 'status': 'connected', 'session_id': session_id, 'message': 'Agent stream connected.'})
        while True:
            try:
                await websocket.receive_text()
            except WebSocketDisconnect:
                break
    finally:
        ws_manager.disconnect(websocket)
