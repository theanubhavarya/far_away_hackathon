import urllib.request
import json

data = {
    "origin": "Delhi",
    "destination": "Bengaluru",
    "travel_date": "2026-10-15",
    "travelers": {"adults": 1, "children": 0, "seniors": 0, "pwd": 0, "bags": 1},
    "mode": "ECONOMIC",
    "accessibility": False,
    "pickup_area": "Akshardham"
}

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/routes/plan",
    data=json.dumps(data).encode("utf-8"),
    headers={"Content-Type": "application/json", "Accept": "application/json"}
)

with urllib.request.urlopen(req) as resp:
    routes = json.loads(resp.read()).get("routes", [])
    for r in routes[:1]:
        print(f"Cost: {r['total_cost_inr']} for {len(r['segments'])} segments")
        for seg in r['segments']:
            print(f"  {seg['mode']}: {seg['origin_stop']['station_name']} -> {seg['destination_stop']['station_name']}")
