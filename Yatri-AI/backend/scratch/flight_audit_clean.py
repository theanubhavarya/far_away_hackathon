import sys
import os
import pandas as pd
from pathlib import Path

backend_dir = Path("c:/Users/somes/Downloads/Plan2Go-Final/backend")
datasets_dir = backend_dir / "datasets"

sys.path.insert(0, str(backend_dir))
from route_providers import normalize_city, STATION_CODES

def run_clean_audit():
    flight_csv = datasets_dir / "finalairways.csv"
    train_csv = datasets_dir / "finalrailways.csv"
    
    df_flight = pd.read_csv(flight_csv)
    df_flight['__source_city'] = df_flight['Source'].map(normalize_city)
    df_flight['__destination_city'] = df_flight['Destination'].map(normalize_city)
    
    # 2. Source | Destination | Row Count table
    print("Source | Destination | Row Count (Raw Values)")
    print("-" * 50)
    raw_grp = df_flight.groupby(['Source', 'Destination']).size().reset_index(name='Count')
    for idx, row in raw_grp.iterrows():
        print(f"{row['Source']} | {row['Destination']} | {row['Count']}")
        
    print("\nSource | Destination | Row Count (Normalized Values)")
    print("-" * 50)
    norm_grp = df_flight.groupby(['__source_city', '__destination_city']).size().reset_index(name='Count')
    for idx, row in norm_grp.iterrows():
        print(f"{row['__source_city']} | {row['__destination_city']} | {row['Count']}")

    # 3, 4, 5. Specific verifications
    specific = [
        ("Delhi", "Mumbai"),
        ("Mumbai", "Delhi"),
        ("Bangalore", "Mumbai"),
        ("Mumbai", "Bangalore"),
        ("Bangalore", "Delhi"),
        ("Delhi", "Bangalore"),
    ]
    
    print("\nSPECIFIC ROUTE VERIFICATION DETAILS")
    print("=" * 100)
    for src, dest in specific:
        match = df_flight[
            (df_flight['__source_city'] == src) & (df_flight['__destination_city'] == dest)
        ]
        print(f"\nRoute: {src} -> {dest}")
        print(f"  Matches Found: {len(match)}")
        if len(match) > 0:
            print("  Exact Raw Values in Columns:")
            raw_combos = match.groupby(['Source', 'Destination']).size().reset_index(name='Count')
            for _, r in raw_combos.iterrows():
                print(f"    Raw: Source='{r['Source']}', Destination='{r['Destination']}' | Count: {r['Count']}")
                print(f"    Normalized: __source_city='{normalize_city(r['Source'])}', __destination_city='{normalize_city(r['Destination'])}'")
        else:
            print("  No raw combinations exist that normalize to this route.")

    # 7. Missing city pairs compared to train
    df_train = pd.read_csv(train_csv)
    
    def code_to_city(code):
        code = str(code).strip().upper()
        for city, codes in STATION_CODES.items():
            if code in codes:
                return city
        return None
        
    df_train['__from_city'] = df_train['fromStnCode'].map(code_to_city)
    df_train['__to_city'] = df_train['toStnCode'].map(code_to_city)
    
    # Filter out station codes that do not map to canonical cities
    df_train_valid = df_train.dropna(subset=['__from_city', '__to_city'])
    train_pairs = df_train_valid.groupby(['__from_city', '__to_city']).size().reset_index(name='Count')
    
    train_set = set(zip(train_pairs['__from_city'], train_pairs['__to_city']))
    flight_set = set(zip(df_flight['__source_city'], df_flight['__destination_city']))
    
    # Compare only canonical intercity pairs between Delhi, Bangalore, Mumbai, Chennai, Kolkata, Kochi, Hyderabad, Pune, etc.
    # Let's get unique canonical cities list in train
    all_train_cities = set(train_pairs['__from_city']).union(set(train_pairs['__to_city']))
    print(f"\nCanonical cities in train station codes: {sorted(list(all_train_cities))}")
    
    missing = train_set - flight_set
    print(f"\nCanonical city pairs present in Train but missing in Flight (total {len(missing)}):")
    for s, d in sorted(missing):
        print(f"  - {s} -> {d}")

if __name__ == "__main__":
    run_clean_audit()
