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

from route_providers import DatasetRouteProvider, normalize_city
from recommend import RouteRecommender
from app.services.ai_service import AIService
from app.schemas.route_schemas import PlanRouteRequest

def audit_bangalore_intracity():
    print("=== A. BANGALORE INTRACITY INVESTIGATION ===")
    
    # 1. Inspect finalbangloreroadways.csv
    csv_path = backend_dir / "datasets" / "finalbangloreroadways.csv"
    print(f"Dataset path: {csv_path}")
    if csv_path.exists():
        df = pd.read_csv(csv_path)
        print(f"Row count: {len(df)}")
        pickups = df['Pickup Location'].dropna().unique()
        drops = df['Drop Location'].dropna().unique()
        print(f"Unique pickup locations: {len(pickups)}")
        print(f"Unique drop locations: {len(drops)}")
        
        # Check columns
        print(f"Columns: {list(df.columns)}")
        
        # Check booking values and distance
        print(f"Booking Value mean: {df['Booking Value'].mean():.2f}, min: {df['Booking Value'].min()}, max: {df['Booking Value'].max()}")
        print(f"Ride Distance mean: {df['Ride Distance'].mean():.2f}, min: {df['Ride Distance'].min()}, max: {df['Ride Distance'].max()}")
        
        zero_rows = df[(df['Booking Value'] == 0) | (df['Ride Distance'] == 0)]
        print(f"Rows with zero value/distance: {len(zero_rows)} ({len(zero_rows)/len(df)*100:.2f}%)")
    else:
        print("Dataset not found!")

    # 2. Trace queries
    recommender = RouteRecommender(str(backend_dir))
    provider = recommender.dataset_provider
    date_obj = datetime(2026, 6, 12)
    
    queries = [
        ("HSR Layout", "Whitefield"),
        ("Indiranagar", "Whitefield"),
        ("Electronic City", "Airport") # Wait, is "Airport" canonical or do we search Devanahalli? Let's check unique locations
    ]
    
    # Check if locations are valid
    locs = provider.get_intracity_locations("Bangalore")
    print(f"\nBangalore Locations: {locs[:30]}...")
    
    # We will query these pairs
    for pickup, drop in queries:
        print(f"\nQuery: {pickup} -> {drop}")
        # Search dataset
        matches = provider.search_local_cabs("Bangalore", pickup, drop)
        print(f"  Rows matched in Dataset: {len(matches)}")
        
        # Generate candidates
        candidates = recommender.generate_candidates("Bangalore", "Bangalore", pickup, drop, date_obj)
        print(f"  Candidates generated: {len(candidates)}")
        
        if candidates:
            # Print the first candidate details before ranking
            first_route = candidates[0]
            print("  First candidate before ranking:")
            for leg in first_route:
                print(f"    - Type: {leg['Transport_Type']} | Mode: {leg['Mode']} | Source: {leg['Source']} | Destination: {leg['Destination']} | Distance: {leg.get('Dataset_Distance')} | Duration: {leg['Duration']} | Price: {leg['Price']} | Comfort: {leg.get('Comfort'):.4f}")
        else:
            print("  No candidates generated!")

def audit_bangalore_delhi_flights():
    print("\n=== B. BANGALORE -> DELHI FLIGHT INVESTIGATION ===")
    
    # 1. Dataset loading
    csv_path = backend_dir / "datasets" / "finalairways.csv"
    df = pd.read_csv(csv_path)
    df['__source_city'] = df['Source'].map(normalize_city)
    df['__destination_city'] = df['Destination'].map(normalize_city)
    
    matches = df[df['__source_city'].eq("Bangalore") & df['__destination_city'].eq("Delhi")]
    print(f"Total Bangalore -> Delhi flight rows in dataset: {len(matches)}")
    print(f"Unique raw Source values: {matches['Source'].unique()}")
    print(f"Unique raw Destination values: {matches['Destination'].unique()}")
    
    # 2 & 3. Candidates
    recommender = RouteRecommender(str(backend_dir))
    provider = recommender.dataset_provider
    date_obj = datetime(2026, 6, 12)
    
    flight_routes = provider.flight_provider.search_routes("Bangalore", "Delhi", date_obj)
    print(f"Flight candidates returned by provider: {len(flight_routes)}")
    
    candidates = recommender.generate_candidates("Bangalore", "Delhi", "", "", date_obj)
    print(f"Total candidates before ranking: {len(candidates)}")
    
    # Let's count by type
    types = {}
    for route in candidates:
        primary = next((leg['Transport_Type'] for leg in route if leg['Transport_Type'] != 'Cab'), route[0]['Transport_Type'])
        types[primary] = types.get(primary, 0) + 1
    print(f"Candidates by type: {types}")
    
    # Score candidates under Economical preference (mode = 'ECONOMIC')
    scored = []
    for idx, route in enumerate(candidates):
        score, price, duration, comfort = recommender.score_route(route, 'Economical')
        primary = next((leg['Transport_Type'] for leg in route if leg['Transport_Type'] != 'Cab'), route[0]['Transport_Type'])
        scored.append({
            'index': idx + 1,
            'primary': primary,
            'price': price,
            'duration': duration,
            'comfort': comfort,
            'score': score,
            'route': route
        })
    
    scored.sort(key=lambda x: x['score'], reverse=True)
    print("\nTop 20 Scored Routes under 'Economical' (Backend raw candidates):")
    print(f"{'Rank':<4} | {'Type':<8} | {'Cost':<6} | {'Duration':<8} | {'Score':<15}")
    print("-" * 55)
    for rank, item in enumerate(scored[:20]):
        print(f"{rank+1:<4} | {item['primary']:<8} | {item['price']:<6.0f} | {item['duration']:<8.0f} | {item['score']:<15.2f}")
        
    # 4. API response verification (under limit=5 vs higher limits)
    ai_service = AIService(backend_dir)
    request = PlanRouteRequest(
        origin="Bangalore",
        destination="Delhi",
        travel_date="2026-06-12",
        travelers={'adults': 1, 'children': 0, 'seniors': 0, 'pwd': 0, 'bags': 1},
        mode="ECONOMIC",
        accessibility=False
    )
    
    # We will simulate plan_routes with limit=5 (default in AIService.plan_routes)
    response_5 = ai_service.plan_routes(request)
    print(f"\nAPI Response with limit=5 (Actual backend call):")
    print(f"Total routes returned: {len(response_5.routes)}")
    for idx, r in enumerate(response_5.routes):
        modes = [s.mode for s in r.segments]
        print(f"  Route {idx+1}: Segments={modes} | Cost=Rs.{r.total_cost_inr} | Duration={r.total_time_minutes} min")

    # Let's inspect what happens with limit = 10
    import app.services.route_service as route_service
    response_10 = route_service.plan_routes(request, limit=10)
    print(f"\nAPI Response with limit=10 (If backend limit was expanded):")
    print(f"Total routes returned: {len(response_10.routes)}")
    for idx, r in enumerate(response_10.routes):
        modes = [s.mode for s in r.segments]
        print(f"  Route {idx+1}: Segments={modes} | Cost=Rs.{r.total_cost_inr} | Duration={r.total_time_minutes} min")

if __name__ == "__main__":
    audit_bangalore_intracity()
    audit_bangalore_delhi_flights()
