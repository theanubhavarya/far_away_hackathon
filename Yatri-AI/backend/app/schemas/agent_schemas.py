from typing import Optional
from pydantic import BaseModel

class AgentInfo(BaseModel):
    id: str
    name: str
    status: str
    role: str
    queries_handled: int
    avg_response_ms: float
    last_query: Optional[str] = None

class AgentStreamMessage(BaseModel):
    type: str
    agent: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None
    timestamp: Optional[int] = None
    session_id: Optional[str] = None
