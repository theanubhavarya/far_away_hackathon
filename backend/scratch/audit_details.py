import sys
import os
from pathlib import Path
from datetime import datetime
import pandas as pd
import numpy as np
import torch

backend_dir = Path("c:/Users/somes/Downloads/Plan2Go-Final/backend")
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from route_providers import DatasetRouteProvider, LocalCabProvider, normalize_city
from recommend import RouteRecommender, COMFORT_MAP, SPEED_RANK, COST_RANK, LUXURY_RANK, CARBON_FACTOR

def run_detailed_audit():
    recommender = RouteRecommender(str(backend_dir))
    provider = recommender.dataset_provider
    date_obj = datetime(2026, 6, 12)
    
    # Generate candidates for Delhi -> Mumbai
    candidates_dm = recommender.generate_candidates("Delhi", "Mumbai", "", "", date_obj)
    
    print("\n--- PART 4: ML FEATURE VECTORS ---")
    for idx, route in enumerate(candidates_dm):
        main_leg = next((leg for leg in route if leg['Transport_Type'] != 'Cab'), route[0])
        trans_type = main_leg['Transport_Type']
        mode = main_leg['Mode']
        source = main_leg['Source']
        dest = main_leg['Destination']
        
        stats = recommender._route_stats(trans_type, source, dest)
        distance_est = stats.get('distance', 500)
        
        day = date_obj.day
        month = date_obj.month
        weekday = date_obj.weekday()
        is_weekend = 1 if weekday >= 5 else 0
        
        dummy = pd.DataFrame([[distance_est, 0, 0]], columns=['Distance', 'Duration', 'Price'])
        dist_scaled = recommender.scaler.transform(dummy)[0][0]
        
        def encode_value(encoder, val):
            try:
                return recommender._encode_safe(encoder, val)
            except ValueError:
                return -1 # indicator for unknown/out-of-vocabulary
        
        t_idx = encode_value(recommender.encoders['Transport_Type'], trans_type)
        m_idx = encode_value(recommender.encoders['Mode'], mode)
        s_idx = encode_value(recommender.encoders['Source'], source)
        d_idx = encode_value(recommender.encoders['Destination'], dest)
        
        raw_feature = [trans_type, mode, source, dest, distance_est, day, month, weekday, is_weekend]
        scaled_feature = [t_idx, m_idx, s_idx, d_idx, dist_scaled, day, month, weekday, is_weekend]
        
        print(f"\nRoute {idx+1} ({trans_type} - {mode}):")
        print(f"  Raw Feature Vector: {raw_feature}")
        print(f"  Scaled Feature Vector: {scaled_feature}")
        
        # If successfully encoded (no -1), let's get NN predictions
        if -1 not in (t_idx, m_idx, s_idx, d_idx):
            cont_features_t = torch.tensor([[dist_scaled, day, month, weekday, is_weekend]], dtype=torch.float32)
            t_idx_t = torch.tensor([t_idx])
            m_idx_t = torch.tensor([m_idx])
            s_idx_t = torch.tensor([s_idx])
            d_idx_t = torch.tensor([d_idx])
            
            with torch.no_grad():
                p_pred_s, d_pred_s, c_pred_s = recommender.model(t_idx_t, m_idx_t, s_idx_t, d_idx_t, cont_features_t)
            
            inv = recommender.scaler.inverse_transform([[dist_scaled, d_pred_s.item(), p_pred_s.item()]])
            duration_pred = inv[0][1]
            price_pred = inv[0][2]
            
            print(f"  NN predicted Comfort: {c_pred_s.item():.4f}")
            print(f"  NN predicted Price: {price_pred:.2f}")
            print(f"  NN predicted Duration: {duration_pred:.2f}")
        else:
            print("  NN predictions bypassed due to unknown category in encoders.")
            
        score, _, _, _ = recommender.score_route(route, 'Balanced')
        print(f"  ML score under 'Balanced': {score:.4f}")

if __name__ == "__main__":
    run_detailed_audit()
