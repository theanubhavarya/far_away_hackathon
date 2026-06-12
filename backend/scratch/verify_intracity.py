import sys
from pathlib import Path

backend_dir = Path("c:/Users/somes/Downloads/Plan2Go-Final/backend")
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.schemas.route_schemas import PlanRouteRequest, TravelerConfig
from app.services.route_service import plan_routes
from app.ml.engine import load_engine

def get_route_summary(pickup, drop, mode):
    req = PlanRouteRequest(
        origin="Bangalore",
        destination="Bangalore",
        travel_date="2026-06-12",
        travelers=TravelerConfig(adults=1, children=0, seniors=0, pwd=0, bags=0),
        mode=mode,
        accessibility=False,
        city="Bangalore",
        pickup_area=pickup,
        drop_area=drop
    )
    pref = {"FASTEST": "Fastest", "ECONOMIC": "Economical"}.get(mode, "Economical")
    engine = load_engine()
    scored = engine.get_all_scored_routes(
        "Bangalore", "Bangalore", "2026-06-12", pref,
        pickup_area=pickup, drop_area=drop
    )
    if not scored:
        return None
    best_candidate = scored[0]
    raw_leg = best_candidate["route"][0]
    
    res = plan_routes(req)
    if not res.routes:
        return None
    best = res.routes[0]
    
    return {
        "operator": best.segments[0].operator,
        "distance": raw_leg.get("Dataset_Distance") or 0.0,
        "duration": best.total_time_minutes,
        "price": best.total_cost_inr
    }

if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
        
    routes = [
        ("HSR Layout", "Whitefield"),
        ("Indiranagar", "Whitefield"),
        ("Koramangala", "Whitefield")
    ]
    
    print("| Route | Preference | Vehicle Type | Distance (km) | Duration (mins) | Total Price (INR) |")
    print("| --- | --- | --- | --- | --- | --- |")
    for p, d in routes:
        for mode in ["FASTEST", "ECONOMIC"]:
            summary = get_route_summary(p, d, mode)
            if summary:
                print(f"| {p} -> {d} | {mode} | {summary['operator']} | {summary['distance']:.2f} | {summary['duration']} | Rs. {summary['price']} |")

