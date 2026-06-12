import urllib.request
import json

def verify_mode(mode_name):
    url = "http://localhost:8000/api/v1/routes/plan"
    payload = {
        "origin": "Bangalore",
        "destination": "Delhi",
        "travel_date": "2026-06-12",
        "travelers": {
            "adults": 1,
            "children": 0,
            "seniors": 0,
            "pwd": 0,
            "bags": 1
        },
        "mode": mode_name,
        "accessibility": False
    }
    
    print(f"\n1. Sending request payload for Mode = {mode_name}:")
    print(json.dumps(payload, indent=2))
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            print(f"2. Confirming backend response received for Mode = {mode_name}:")
            routes = res_data.get("routes", [])
            print(f"   Total routes returned: {len(routes)}")
            for idx, r in enumerate(routes):
                modes = [s.get("mode") for s in r.get("segments", [])]
                print(f"     Route {idx+1}: Segments={modes} | Cost=Rs.{r.get('total_cost_inr')} | Duration={r.get('total_time_minutes')} min | Comfort={r.get('comfort_score')} | Tags={r.get('tags')}")
    except Exception as e:
        print(f"Error calling API: {e}")

if __name__ == "__main__":
    verify_mode("FASTEST")
    verify_mode("MAX_COMFORT")
