from dataclasses import dataclass, field
from typing import Dict, List

@dataclass
class AgentRecord:
    id: str
    name: str
    role: str
    status: str = 'idle'
    queries_handled: int = 0
    avg_response_ms: float = 0.0
    last_query: str = ''

    def begin_query(self, query: str) -> None:
        self.status = 'thinking'
        self.last_query = query

    def complete_query(self, response_ms: float) -> None:
        self.status = 'complete'
        self.queries_handled += 1
        self.avg_response_ms = (
            (self.avg_response_ms * (self.queries_handled - 1) + response_ms)
            / max(self.queries_handled, 1)
        )

    def error(self, message: str) -> None:
        self.status = 'error'
        self.last_query = message

@dataclass
class AgentManager:
    agents: Dict[str, AgentRecord] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.agents = {
            'routing': AgentRecord(id='routing', name='Routing Agent', role='Route analysis'),
            'pricing': AgentRecord(id='pricing', name='Pricing Agent', role='Cost evaluation'),
            'comfort': AgentRecord(id='comfort', name='Comfort Agent', role='Comfort scoring'),
            'disruption': AgentRecord(id='disruption', name='Disruption Agent', role='Resilience management'),
            'optimization': AgentRecord(id='optimization', name='Optimization Agent', role='Route optimization'),
        }

    def begin(self, agent_id: str, query: str) -> AgentRecord:
        agent = self.agents[agent_id]
        agent.begin_query(query)
        return agent

    def complete(self, agent_id: str, response_ms: float) -> AgentRecord:
        agent = self.agents[agent_id]
        agent.complete_query(response_ms)
        return agent

    def error(self, agent_id: str, message: str) -> AgentRecord:
        agent = self.agents[agent_id]
        agent.error(message)
        return agent

    def list(self) -> List[AgentRecord]:
        return list(self.agents.values())
