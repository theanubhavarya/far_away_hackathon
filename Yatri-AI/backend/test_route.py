import sys
import datetime
import json
from pathlib import Path

# Add backend directory to path
backend_dir = str(Path(__file__).resolve().parents[0])
sys.path.insert(0, backend_dir)

from recommend import RouteRecommender

# ensure artifacts path is correct relative to the script
r = RouteRecommender(data_dir=backend_dir)
date_obj = datetime.datetime.strptime("2026-10-15", "%Y-%m-%d")
candidates = r.generate_candidates("Delhi", "Bangalore", "Akshardham", "Dwarka", date_obj)

print("Generated candidates count:", len(candidates))
if candidates:
    print(json.dumps(candidates[0], indent=2))
