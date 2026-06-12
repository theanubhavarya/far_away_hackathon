from typing import Dict, List, Optional
from pydantic import BaseModel

class GroupPayload(BaseModel):
    group_name: str
    members: List[str]
    destination_options: Optional[List[str]] = None
    budget_per_person: float

class GroupTrip(BaseModel):
    group_id: str
    group_name: str
    members: List[str]
    destination_votes: Dict[str, int]
    budget_per_person: float
    total_budget: float
    status: str
