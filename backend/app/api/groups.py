from fastapi import APIRouter, HTTPException, Query

from app.schemas import GroupPayload, GroupTrip
from app.services.group_service import GROUPS, create_group, vote

router = APIRouter(prefix="/api/v1/groups", tags=["groups"])


@router.post("", response_model=GroupTrip)
def create(payload: GroupPayload):
    return create_group(payload)


@router.post("/{group_id}/vote")
def vote_destination(group_id: str, destination: str = Query(...), member: str = Query(...)):
    if group_id not in GROUPS:
        raise HTTPException(status_code=404, detail="Group not found")
    return vote(group_id, destination, member)
