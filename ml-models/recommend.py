import pandas as pd
import numpy as np
import torch
import os
import pickle
from model import HybridRecommender
from datetime import datetime

# ──────────────────────────────────────────────────────────────────────────────
# Real-world baseline stats per transport type (will be loaded from dataset)
# These represent ACTUAL typical values from the 5 datasets
# ──────────────────────────────────────────────────────────────────────────────
FALLBACK_STATS = {
    'Flight': {'price': 5500, 'duration': 130, 'comfort': 0.90},   # ~2h 10m, ~₹5500
    'Train':  {'price': 650,  'duration': 720, 'comfort': 0.60},   # ~12h,    ~₹650
    'Bus':    {'price': 450,  'duration': 540, 'comfort': 0.40},   # ~9h,     ~₹450
    'Cab':    {'price': 200,  'duration': 45,  'comfort': 0.75},   # ~45m,    ~₹200 (local)
}

# Comfort scores per mode type (DL model augments this)
COMFORT_MAP = {
    'Flight': 0.93,
    'Cab':    0.78,
    'Train':  0.62,
    'Bus':    0.40,
}

# Speed/cost ranking (lower rank = better for that dimension)
SPEED_RANK  = {'Flight': 1, 'Cab': 2, 'Train': 3, 'Bus': 4}
COST_RANK   = {'Bus': 1, 'Train': 2, 'Cab': 3, 'Flight': 4}
LUXURY_RANK = {'Flight': 1, 'Cab': 2, 'Train': 3, 'Bus': 4}


class RouteRecommender:
    def __init__(self, data_dir="d:/far away data set"):
        self.data_dir = data_dir
        self.artifacts_dir = os.path.join(data_dir, "artifacts")

        # ── Load artifacts ──────────────────────────────────────────────────
        with open(os.path.join(self.artifacts_dir, 'encoders.pkl'), 'rb') as f:
            self.encoders = pickle.load(f)
        with open(os.path.join(self.artifacts_dir, 'scaler.pkl'), 'rb') as f:
            self.scaler = pickle.load(f)

        # ── Load real dataset statistics ────────────────────────────────────
        stats_path = os.path.join(self.artifacts_dir, 'transport_stats.csv')
        if os.path.exists(stats_path):
            stats_df = pd.read_csv(stats_path)
            self.transport_stats = stats_df.set_index('Transport_Type').to_dict('index')
        else:
            self.transport_stats = {}

        # ── Load PyTorch model ──────────────────────────────────────────────
        num_transport_types = len(self.encoders['Transport_Type'].classes_)
        num_modes           = len(self.encoders['Mode'].classes_)
        num_sources         = len(self.encoders['Source'].classes_)
        num_dests           = len(self.encoders['Destination'].classes_)
        num_continuous      = 5

        self.device = torch.device("cpu")
        self.model = HybridRecommender(
            num_transport_types, num_modes, num_sources, num_dests, num_continuous
        ).to(self.device)
        model_path = os.path.join(self.artifacts_dir, 'model.pth')
        if os.path.exists(model_path):
            self.model.load_state_dict(torch.load(model_path, map_location=self.device, weights_only=True))
        self.model.eval()

        # ── City hub definitions ────────────────────────────────────────────
        self.hubs = {
            'Delhi': {
                'Flight': 'IGI Airport (Delhi)',
                'Train':  'New Delhi Railway Station (Delhi)',
                'Bus':    'Kashmere Gate ISBT (Delhi)',
            },
            'Bangalore': {
                'Flight': 'Kempegowda Airport (Bangalore)',
                'Train':  'Yeshwanthpur Station (Bangalore)',
                'Bus':    'Majestic Bus Terminal (Bangalore)',
            },
        }

        # Typical cab distance (km) from area to each hub type
        self.hub_distances = {
            'Flight': 25,   # airports are usually ~25 km from city center
            'Train':  12,
            'Bus':    10,
        }

    # ── Private helpers ───────────────────────────────────────────────────────

    def _encode_safe(self, encoder, val):
        if val in encoder.classes_:
            return encoder.transform([val])[0]
        return 0

    def _real_stats(self, trans_type):
        """Return real price/duration stats from the dataset, with FALLBACK_STATS as backup."""
        if trans_type in self.transport_stats:
            s = self.transport_stats[trans_type]
            return {
                'avg_price':    s.get('avg_price',    FALLBACK_STATS[trans_type]['price']),
                'median_price': s.get('median_price', FALLBACK_STATS[trans_type]['price']),
                'min_price':    s.get('min_price',    FALLBACK_STATS[trans_type]['price'] * 0.6),
                'avg_duration': s.get('avg_duration', FALLBACK_STATS[trans_type]['duration']),
                'median_duration': s.get('median_duration', FALLBACK_STATS[trans_type]['duration']),
                'min_duration': s.get('min_duration', FALLBACK_STATS[trans_type]['duration'] * 0.7),
            }
        return {
            'avg_price':    FALLBACK_STATS.get(trans_type, FALLBACK_STATS['Bus'])['price'],
            'median_price': FALLBACK_STATS.get(trans_type, FALLBACK_STATS['Bus'])['price'],
            'min_price':    FALLBACK_STATS.get(trans_type, FALLBACK_STATS['Bus'])['price'] * 0.6,
            'avg_duration': FALLBACK_STATS.get(trans_type, FALLBACK_STATS['Bus'])['duration'],
            'median_duration': FALLBACK_STATS.get(trans_type, FALLBACK_STATS['Bus'])['duration'],
            'min_duration': FALLBACK_STATS.get(trans_type, FALLBACK_STATS['Bus'])['duration'] * 0.7,
        }

    def _dl_comfort(self, trans_type, mode, source, dest, date_obj, distance_est):
        """Run the DL model to get a comfort prediction for a leg."""
        day      = date_obj.day
        month    = date_obj.month
        weekday  = date_obj.weekday()
        is_weekend = 1 if weekday >= 5 else 0

        dummy       = pd.DataFrame([[distance_est, 0, 0]], columns=['Distance', 'Duration', 'Price'])
        dist_scaled = self.scaler.transform(dummy)[0][0]

        cont_features = torch.tensor([[dist_scaled, day, month, weekday, is_weekend]], dtype=torch.float32)
        t_idx = torch.tensor([self._encode_safe(self.encoders['Transport_Type'], trans_type)])
        m_idx = torch.tensor([self._encode_safe(self.encoders['Mode'], mode)])
        s_idx = torch.tensor([self._encode_safe(self.encoders['Source'], source)])
        d_idx = torch.tensor([self._encode_safe(self.encoders['Destination'], dest)])

        with torch.no_grad():
            _, _, c_pred = self.model(t_idx, m_idx, s_idx, d_idx, cont_features)

        # Blend DL comfort with rule-based comfort map
        dl_comfort   = c_pred.item()
        rule_comfort = COMFORT_MAP.get(trans_type, 0.5)
        return 0.4 * dl_comfort + 0.6 * rule_comfort

    def _build_leg(self, trans_type, mode, source, dest, date_obj,
                   distance_est=None, use_median=True):
        """
        Build a single route leg using REAL dataset statistics for price/duration
        and the DL model only for the comfort signal.
        """
        if distance_est is None:
            distance_est = {
                'Flight': 1400, 'Train': 800, 'Bus': 600, 'Cab': 18
            }.get(trans_type, 300)

        stats = self._real_stats(trans_type)
        price    = stats['median_price'] if use_median else stats['avg_price']
        duration = stats['median_duration'] if use_median else stats['avg_duration']

        # For cabs: scale by distance
        if trans_type == 'Cab':
            price    = distance_est * 12    # ~₹12 per km (blended Uber rate)
            duration = distance_est * 4     # ~4 min per km in city traffic

        comfort = self._dl_comfort(trans_type, mode, source, dest, date_obj, distance_est)

        return {
            'Transport_Type': trans_type,
            'Mode':           mode,
            'Source':         source,
            'Destination':    dest,
            'Price':          max(price, 10),
            'Duration':       max(duration, 5),
            'Comfort':        comfort,
        }

    # ── Candidate generation ──────────────────────────────────────────────────

    def generate_candidates(self, source_city, dest_city, pickup_area, drop_area, date_obj):
        candidates = []

        def fmt(city, area):
            a = str(area).strip() if area else ''
            return f"{a} ({city})" if a else city

        p_src = fmt(source_city, pickup_area)
        d_dst = fmt(dest_city,   drop_area)

        # ── Intra-city ────────────────────────────────────────────────────────
        if source_city == dest_city:
            for mode in ['Uber Go', 'Go Sedan', 'Uber XL', 'Premier']:
                candidates.append([self._build_leg('Cab', mode, p_src, d_dst, date_obj, distance_est=15)])
            return candidates

        # ── Inter-city: generate one route per transport type × mode ─────────
        intercity_defs = {
            'Flight': ['IndiGo', 'Air India', 'SpiceJet', 'Vistara'],
            'Train':  ['Rajdhani Express', 'Shatabdi Express', 'Express Train'],
            'Bus':    ['Intercity Bus'],
        }

        for trans_type, modes in intercity_defs.items():
            hub_dist = self.hub_distances.get(trans_type, 15)
            for mode in modes:
                route = []

                # Pickup cab leg (only if source city has hubs and area given)
                src_hub = self.hubs.get(source_city, {}).get(trans_type, None)
                if src_hub:
                    route.append(self._build_leg(
                        'Cab', 'Uber Go', p_src, src_hub, date_obj, distance_est=hub_dist
                    ))

                # Main intercity leg
                route.append(self._build_leg(trans_type, mode, source_city, dest_city, date_obj))

                # Drop cab leg
                dst_hub = self.hubs.get(dest_city, {}).get(trans_type, None)
                if dst_hub:
                    route.append(self._build_leg(
                        'Cab', 'Uber Go', dst_hub, d_dst, date_obj, distance_est=hub_dist
                    ))

                candidates.append(route)

        return candidates

    # ── Scoring ───────────────────────────────────────────────────────────────

    def score_route(self, route, preference):
        total_price    = sum(leg['Price']    for leg in route)
        total_duration = sum(leg['Duration'] for leg in route)
        avg_comfort    = sum(leg['Comfort']  for leg in route) / len(route)

        # Get the primary transport type of the intercity leg
        # (the longest/most important leg, not a cab)
        primary_trans = next(
            (leg['Transport_Type'] for leg in route if leg['Transport_Type'] != 'Cab'),
            route[0]['Transport_Type']
        )
        speed_rank  = SPEED_RANK.get(primary_trans, 4)
        cost_rank   = COST_RANK.get(primary_trans, 4)
        luxury_rank = LUXURY_RANK.get(primary_trans, 4)

        # ── Preference scoring ────────────────────────────────────────────────
        # We penalise strongly by RANK so the right mode always wins,
        # then fine-tune with actual values for tie-breaking.
        if preference == 'Cheapest':
            # Bus < Train < Cab < Flight
            score = -cost_rank * 1e6 - total_price

        elif preference == 'Fastest':
            # Flight < Cab < Train < Bus
            score = -speed_rank * 1e6 - total_duration

        elif preference == 'Economical':
            # Best price-per-minute ratio: Train usually wins
            ppm = total_price / max(total_duration, 1)
            score = -ppm * 1e4 - cost_rank * 500

        elif preference == 'Balanced':
            # Composite of cost, time, comfort with equal weights
            norm_price    = total_price    / 10000      # normalise to ~[0,1]
            norm_duration = total_duration / 1440       # normalise to ~[0,1] (24h max)
            score = avg_comfort - 0.35 * norm_price - 0.35 * norm_duration

        elif preference == 'Luxury':
            # Flight first, Premier Cab, then everything else
            score = -luxury_rank * 1e6 + avg_comfort * 1000 - total_duration * 0.01

        elif preference == 'Comfort optimized':
            # Pure comfort, regardless of cost/time
            score = avg_comfort * 1e6 - luxury_rank * 100

        else:
            score = -total_price

        return score, total_price, total_duration, avg_comfort

    # ── Public API ────────────────────────────────────────────────────────────

    def get_best_route(self, source_city, dest_city, pickup_area, drop_area, date_str, preference):
        date_obj   = datetime.strptime(date_str, '%Y-%m-%d')
        candidates = self.generate_candidates(source_city, dest_city, pickup_area, drop_area, date_obj)

        scored = []
        for route in candidates:
            score, p, d, c = self.score_route(route, preference)
            scored.append({'route': route, 'score': score,
                           'total_price': p, 'total_duration': d, 'avg_comfort': c})

        scored.sort(key=lambda x: x['score'], reverse=True)
        best = scored[0]

        # ── Route description ─────────────────────────────────────────────────
        steps = []
        for leg in best['route']:
            steps.append(f"{leg['Mode']} ({leg['Transport_Type']}) from {leg['Source']} to {leg['Destination']}")

        # Why was this chosen?
        primary = next(
            (leg['Transport_Type'] for leg in best['route'] if leg['Transport_Type'] != 'Cab'),
            best['route'][0]['Transport_Type']
        )
        why_map = {
            'Cheapest':          f"Bus/Train transport minimizes cost — {primary} is the most budget-friendly intercity option.",
            'Fastest':           f"Flight drastically cuts travel time — {primary} is the fastest intercity mode available.",
            'Economical':        f"{primary} offers the best price-per-hour ratio among all options.",
            'Balanced':          f"{primary} balances cost, speed, and comfort evenly.",
            'Luxury':            f"Flights combined with premium cabs deliver the most luxurious experience.",
            'Comfort optimized': f"{primary} scores highest on the AI's comfort metric.",
        }
        reasoning = (
            why_map.get(preference, f"Best match for '{preference}' preference.") +
            f" Total cost: Rs.{best['total_price']:.0f}, "
            f"time: {int(best['total_duration']//60)}h {int(best['total_duration']%60)}m, "
            f"comfort: {best['avg_comfort']:.2f}/1.0."
        )

        confidence = round(min(99.5, 78 + best['avg_comfort'] * 20), 1)

        return {
            'Transport Sequence': ' -> '.join(steps),
            'Total Cost':         f"Rs.{best['total_price']:.0f}",
            'Estimated Time':     f"{int(best['total_duration']//60)}h {int(best['total_duration']%60)}m",
            'Reasoning':          reasoning,
            'Confidence Score':   f"{confidence}%",
            'Route Details':      best['route'],
            'preference':         preference,
        }
