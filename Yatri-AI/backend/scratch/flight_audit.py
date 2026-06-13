import sys
import os
import pandas as pd
from pathlib import Path

backend_dir = Path("c:/Users/somes/Downloads/Plan2Go-Final/backend")
datasets_dir = backend_dir / "datasets"

sys.path.insert(0, str(backend_dir))
from route_providers import normalize_city, STATION_CODES

def run_flight_audit():
    flight_csv = datasets_dir / "finalairways.csv"
    train_csv = datasets_dir / "finalrailways.csv"
    
    if not flight_csv.exists():
        print(f"Error: {flight_csv} does not exist.")
        return
        
    df_flight = pd.read_csv(flight_csv)
    print("=== FLIGHT DATASET OVERVIEW ===")
    print(f"Total Rows: {len(df_flight)}")
    print(f"Columns: {list(df_flight.columns)}")
    
    # Apply normalize_city to see the normalized columns mapping
    df_flight['__source_city'] = df_flight['Source'].map(normalize_city)
    df_flight['__destination_city'] = df_flight['Destination'].map(normalize_city)
    
    # 2. Unique city pairs and row count table (Raw values)
    print("\n=== UNIQUE CITY PAIRS (RAW VALUES) IN FLIGHT DATASET ===")
    raw_pairs = df_flight.groupby(['Source', 'Destination']).size().reset_index(name='Row Count')
    print(raw_pairs.to_string(index=False))
    
    # 2b. Unique city pairs and row count table (Normalized values)
    print("\n=== UNIQUE CITY PAIRS (NORMALIZED VALUES) IN FLIGHT DATASET ===")
    norm_pairs = df_flight.groupby(['__source_city', '__destination_city']).size().reset_index(name='Row Count')
    print(norm_pairs.to_string(index=False))
    
    # 3, 4, 5. Specific route verifications
    specific_routes = [
        ("Delhi", "Mumbai"),
        ("Mumbai", "Delhi"),
        ("Bangalore", "Mumbai"),
        ("Mumbai", "Bangalore"),
        ("Bangalore", "Delhi"),
        ("Delhi", "Bangalore"),
    ]
    
    print("\n=== SPECIFIC ROUTE VERIFICATIONS ===")
    print(f"{'Route':<25} | {'Raw Match Found?':<18} | {'Normalized Match Found?':<24} | {'Row Count':<10}")
    print("-" * 85)
    
    for src, dest in specific_routes:
        # Check raw matches
        raw_match = df_flight[
            (df_flight['Source'].str.lower() == src.lower()) | (df_flight['Source'].str.lower() == 'banglore' if src == 'Bangalore' else False) | (df_flight['Source'].str.lower() == 'new delhi' if src == 'Delhi' else False)
        ]
        # narrow to exact raw pairs that map to this normalized route
        raw_match = raw_match[
            raw_match['Source'].map(normalize_city).eq(src) & raw_match['Destination'].map(normalize_city).eq(dest)
        ]
        
        # Check normalized matches
        norm_match = df_flight[
            df_flight['__source_city'].eq(src) & df_flight['__destination_city'].eq(dest)
        ]
        
        raw_found = "YES" if not raw_match.empty else "NO"
        norm_found = "YES" if not norm_match.empty else "NO"
        count = len(norm_match)
        
        print(f"{src + ' -> ' + dest:<25} | {raw_found:<18} | {norm_found:<24} | {count:<10}")
        
        if count > 0:
            print("  Exact Raw values found:")
            raw_combos = raw_match.groupby(['Source', 'Destination']).size().to_dict()
            for (r_src, r_dst), r_cnt in raw_combos.items():
                print(f"    Raw: '{r_src}' -> '{r_dst}' ({r_cnt} rows)")
                print(f"    Normalized to: '{normalize_city(r_src)}' -> '{normalize_city(r_dst)}'")

    # 7. Compare with train dataset unique routes
    if train_csv.exists():
        df_train = pd.read_csv(train_csv)
        print("\n=== TRAIN DATASET SUMMARY ===")
        print(f"Train columns: {list(df_train.columns)}")
        
        def code_to_city(code):
            code = str(code).strip().upper()
            for city, codes in STATION_CODES.items():
                if code in codes:
                    return city
            return code
            
        df_train['__from_city'] = df_train['fromStnCode'].map(code_to_city)
        df_train['__to_city'] = df_train['toStnCode'].map(code_to_city)
        
        train_pairs = df_train.groupby(['__from_city', '__to_city']).size().reset_index(name='Count')
        print("\nUnique Train City Pairs (derived from station codes):")
        print(train_pairs.to_string(index=False))
        
        # Let's calculate the missing flight city pairs
        train_pairs_set = set(zip(train_pairs['__from_city'], train_pairs['__to_city']))
        flight_pairs_set = set(zip(df_flight['__source_city'], df_flight['__destination_city']))
        
        missing_in_flight = train_pairs_set - flight_pairs_set
        print(f"\nCity pairs present in train dataset but missing in flight dataset: {len(missing_in_flight)}")
        for src, dest in sorted(missing_in_flight):
            print(f"  - {src} -> {dest}")
            
    else:
        print("\nTrain dataset not found.")

if __name__ == "__main__":
    run_flight_audit()
