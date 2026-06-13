import sys
import os
from pathlib import Path
from datetime import datetime
import pandas as pd

backend_dir = Path("c:/Users/somes/Downloads/Plan2Go-Final/backend")
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from route_providers import DatasetRouteProvider, LocalCabProvider, normalize_city
from recommend import RouteRecommender

def audit_bangalore_details():
    print("=== BANGALORE ROADWAYS DETAIL AUDIT ===")
    provider = DatasetRouteProvider(backend_dir)
    bangalore_prov = provider.local_providers.get("Bangalore")
    df = bangalore_prov._load()
    
    # Query HSR Layout -> Whitefield
    matches = df[
        df["__pickup_location"].eq("hsr layout")
        & df["__drop_location"].eq("whitefield")
    ]
    print(f"Total raw matches for HSR Layout -> Whitefield: {len(matches)}")
    print(matches.head(10).to_string())

def audit_flight_details():
    print("\n=== FLIGHT DATASET DETAIL AUDIT ===")
    provider = DatasetRouteProvider(backend_dir)
    flight_prov = provider.flight_provider
    df = flight_prov._load()
    
    print("Unique raw Source values:", df['Source'].unique())
    print("Unique raw Destination values:", df['Destination'].unique())
    print("Unique normalized source cities:", df['__source_city'].unique())
    print("Unique normalized destination cities:", df['__destination_city'].unique())
    
    # Check if there are any routes for Delhi -> Mumbai
    delhi_mumbai_matches = df[
        df["__source_city"].eq("Delhi")
        & df["__destination_city"].eq("Mumbai")
    ]
    print(f"Delhi -> Mumbai normalized matches count: {len(delhi_mumbai_matches)}")
    if not delhi_mumbai_matches.empty:
        print(delhi_mumbai_matches.head(5).to_string())
        
    # Let's print some other source -> destination counts to understand the dataset distribution
    print("\nSome source-destination pair counts in flight dataset:")
    print(df.groupby(['__source_city', '__destination_city']).size().reset_index(name='count').to_string())

if __name__ == "__main__":
    audit_bangalore_details()
    audit_flight_details()
