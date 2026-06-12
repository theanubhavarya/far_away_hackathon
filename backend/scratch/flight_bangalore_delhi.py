import sys
import os
import pandas as pd
from pathlib import Path
from datetime import datetime

# Reconfigure stdout to use UTF-8 just in case
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

backend_dir = Path("c:/Users/somes/Downloads/Plan2Go-Final/backend")
sys.path.insert(0, str(backend_dir))

from app.core import config
from app.services.ai_service import AIService
from route_providers import DatasetRouteProvider
from recommend import RouteRecommender

def trace_flight_path():
    recommender = RouteRecommender(str(backend_dir))
    provider = recommender.dataset_provider
    travel_date = datetime(2026, 6, 12)
    
    # Run the providers search
    all_routes = provider.search_routes("Bangalore", "Delhi", travel_date)
    candidates = recommender.generate_candidates("Bangalore", "Delhi", "", "", travel_date)
    
    # Verify plan_routes API output
    print("\n=== plan_routes() API RESPONSE ===")
    from app.schemas.route_schemas import PlanRouteRequest
    ai_service = AIService(backend_dir)
    
    # We will query all preferences to see if flights are returned under each
    preferences_api = ["ECONOMIC", "FASTEST", "MAX_COMFORT", "SHORTEST", "ECO"]
    for pref_api in preferences_api:
        request = PlanRouteRequest(
            origin="Bangalore",
            destination="Delhi",
            travel_date="2026-06-12",
            travelers={'adults': 1, 'children': 0, 'seniors': 0, 'pwd': 0, 'bags': 1},
            mode=pref_api,
            accessibility=False
        )
        response = ai_service.plan_routes(request)
        print(f"\nPreference Mode: {pref_api}")
        print(f"Total routes in API response: {len(response.routes)}")
        for idx, r in enumerate(response.routes):
            modes = [s.mode for s in r.segments]
            print(f"  Route {idx+1}: ID={r.route_id} | Segments: {modes} | Cost: Rs. {r.total_cost_inr} | Duration: {r.total_time_minutes} min | Tags: {r.tags}")

if __name__ == "__main__":
    trace_flight_path()
