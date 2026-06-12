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

def dataset_audit():
    print("=== A. DATASET AUDIT ===")
    csv_path = backend_dir / "datasets" / "finalbangloreroadways.csv"
    if not csv_path.exists():
        print(f"Error: {csv_path} does not exist.")
        return
        
    df = pd.read_csv(csv_path)
    print(f"Row count: {len(df)}")
    pickups = df['Pickup Location'].dropna().unique()
    drops = df['Drop Location'].dropna().unique()
    print(f"Unique pickup locations count: {len(pickups)}")
    print(f"Unique drop locations count: {len(drops)}")
    
    # Fare = Booking Value
    fare_col = 'Booking Value'
    dist_col = 'Ride Distance'
    
    print(f"Fare (Booking Value) - Min: {df[fare_col].min()}, Max: {df[fare_col].max()}, Average: {df[fare_col].mean():.4f}")
    print(f"Distance (Ride Distance) - Min: {df[dist_col].min()}, Max: {df[dist_col].max()}, Average: {df[dist_col].mean():.4f}")
    
    # Filter out zero values and print non-zero stats
    df_nonzero = df[(df[fare_col] > 0) & (df[dist_col] > 0)]
    print(f"Non-zero rows count: {len(df_nonzero)} ({len(df_nonzero)/len(df)*100:.2f}%)")
    print(f"Non-zero Fare - Min: {df_nonzero[fare_col].min()}, Max: {df_nonzero[fare_col].max()}, Average: {df_nonzero[fare_col].mean():.4f}")
    print(f"Non-zero Distance - Min: {df_nonzero[dist_col].min()}, Max: {df_nonzero[dist_col].max()}, Average: {df_nonzero[dist_col].mean():.4f}")

def route_lookup_and_candidate_audit():
    print("\n=== B & C. ROUTE LOOKUP AND CANDIDATE GENERATION AUDIT ===")
    recommender = RouteRecommender(str(backend_dir))
    provider = recommender.dataset_provider
    date_obj = datetime(2026, 6, 12)
    
    routes_to_trace = [
        ("HSR Layout", "Whitefield"),
        ("Indiranagar", "Whitefield"),
        ("Electronic City", "Airport"),
        ("Koramangala", "Whitefield")
    ]
    
    for pickup, drop in routes_to_trace:
        print(f"\nTracing Route: {pickup} -> {drop}")
        
        # 1. Dataset lookup check
        matches = provider.search_local_cabs("Bangalore", pickup, drop)
        print(f"  Dataset matches count: {len(matches)}")
        for i, m in enumerate(matches[:5]):
            print(f"    Match {i+1}: Vehicle Type={m.get('Mode')} | Distance={m.get('Dataset_Distance')} | Price (Booking Value)={m.get('Dataset_Price')} | Record ID={m.get('Dataset_Record_ID')}")
        if len(matches) > 5:
            print(f"    ... and {len(matches)-5} more matches.")
            
        # 2. Candidate generation check (before ranking)
        candidates = recommender.generate_candidates("Bangalore", "Bangalore", pickup, drop, date_obj)
        print(f"  Candidates generated count: {len(candidates)}")
        for i, route in enumerate(candidates[:5]):
            print(f"    Candidate Route {i+1}:")
            for leg in route:
                print(f"      - Leg: {leg['Transport_Type']} ({leg['Mode']}) from {leg['Source']} to {leg['Destination']}")
                print(f"        Price: {leg['Price']} | Duration: {leg['Duration']} | Comfort: {leg.get('Comfort'):.4f} | Distance: {leg.get('Dataset_Distance')}")
        if len(candidates) > 5:
            print(f"    ... and {len(candidates)-5} more candidate routes.")

def fallback_detection():
    print("\n=== D. FALLBACK DETECTION ===")
    
    # We can just read recommend.py and cost_breakdown to show exactly where things are defined
    # We can just read recommend.py and cost_breakdown to show exactly where things are defined
    # Let's check FALLBACK_STATS in recommend.py
    from recommend import FALLBACK_STATS, COMFORT_MAP
    print(f"FALLBACK_STATS: {FALLBACK_STATS}")
    print(f"COMFORT_MAP: {COMFORT_MAP}")
    
    # Check pricing service food cost defaults
    from services.pricing_service import calculate_segment_fare, get_travellers_count
    # Let's check how the Food cost is added in adapter.py:
    # food = max(120, len(segments) * 150)
    print("Default food fare formula: max(120, len(segments) * 150) INR")
    print("For a 1-segment cab route, this yields exactly: 150 INR")
    print("If segment fare is 1.0 INR, total price becomes: 1.0 + 150 = 151 INR")

if __name__ == "__main__":
    dataset_audit()
    route_lookup_and_candidate_audit()
    fallback_detection()
