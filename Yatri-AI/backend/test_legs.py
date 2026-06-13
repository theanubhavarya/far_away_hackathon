import urllib.request
import json

def test_route(pickup_area, drop_area):
    data = {
        "origin": "Delhi",
        "destination": "Bangalore",
        "travel_date": "2026-06-15",
        "travelers": {"adults": 1, "children": 0, "seniors": 0, "pwd": 0, "bags": 1},
        "mode": "ECONOMIC",
        "accessibility": False,
    }
    if pickup_area:
        data["pickup_area"] = pickup_area
    if drop_area:
        data["drop_area"] = drop_area

    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/routes/plan",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"}
    )

    try:
        with urllib.request.urlopen(req) as resp:
            routes = json.loads(resp.read()).get("routes", [])
            print(f"=== Query: pickup={pickup_area}, drop={drop_area} ===")
            for r in routes[:1]:
                print(f"Route ID: {r['route_id']}")
                print(f"Segments: {len(r['segments'])}")
                for seg in r['segments']:
                    print(f"  {seg['mode']}: {seg['origin_stop']['station_name']} -> {seg['destination_stop']['station_name']}")
    except Exception as e:
        print("Error:", e)

test_route("Rohini", "Whitefield")
test_route("", "")
