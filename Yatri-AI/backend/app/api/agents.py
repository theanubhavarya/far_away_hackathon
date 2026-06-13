from fastapi import APIRouter

from app.services.agent_service import AGENTS

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


@router.get("/status")
def status():
    return {"agents": AGENTS}
