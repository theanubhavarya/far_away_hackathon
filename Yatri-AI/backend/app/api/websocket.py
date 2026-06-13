import asyncio
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])


MESSAGES = [
    ("Orchestrator", "thinking", "Received planning session and preparing tasks"),
    ("Routing Agent", "thinking", "Scanning multimodal route candidates"),
    ("Pricing Agent", "thinking", "Estimating fare bands and local costs"),
    ("Accessibility Agent", "complete", "Accessibility metadata attached"),
    ("Orchestrator", "complete", "Ready to return route options"),
]


@router.websocket("/ws/agent-stream")
async def agent_stream(websocket: WebSocket, session_id: str = "default"):
    await websocket.accept()
    try:
        while True:
            for agent, status, message in MESSAGES:
                await websocket.send_json(
                    {
                        "type": "agent_status",
                        "agent": agent,
                        "status": status,
                        "message": message,
                        "timestamp": time.time(),
                        "session_id": session_id,
                    }
                )
                await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        return
