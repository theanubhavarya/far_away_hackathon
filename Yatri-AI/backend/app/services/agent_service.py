from app.schemas import AgentInfo


AGENTS = [
    AgentInfo(id="orchestrator", name="Orchestrator", status="idle", role="Coordinates route planning agents and response assembly", queries_handled=42, avg_response_ms=320),
    AgentInfo(id="routing", name="Routing Agent", status="idle", role="Scores multimodal route candidates from the ML recommender", queries_handled=39, avg_response_ms=890),
    AgentInfo(id="pricing", name="Pricing Agent", status="idle", role="Builds fare totals, ranges, and ticket-level costs", queries_handled=39, avg_response_ms=340),
    AgentInfo(id="disruption", name="Disruption Agent", status="idle", role="Simulates delays and finds alternate plans", queries_handled=17, avg_response_ms=760),
    AgentInfo(id="accessibility", name="Accessibility Agent", status="idle", role="Adds station accessibility and step-free details", queries_handled=24, avg_response_ms=210),
]
