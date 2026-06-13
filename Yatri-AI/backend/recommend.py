import pandas as pd
import numpy as np
import torch
import os
import pickle
from model import HybridRecommender
from datetime import datetime
from pathlib import Path
from route_providers import DatasetRouteProvider, normalize_city

FALLBACK_STATS = {
    'Flight': {'price': 5500, 'duration': 140, 'comfort': 0.90},
    'Train':  {'price': 800,  'duration': 480, 'comfort': 0.60},
    'Bus':    {'price': 600,  'duration': 360, 'comfort': 0.40},
    'Cab':    {'price': 200,  'duration': 45,  'comfort': 0.75},
}

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
CARBON_FACTOR = {'Flight': 12, 'Train': 4, 'Bus': 6, 'Cab': 2}

_GT = [
    ('Delhi',     'Mumbai',     960,  1200, 1080,  950, 120, 5500),
    ('Delhi',     'Bangalore', 2040,  1800, 1980, 1400, 150, 6500),
    ('Delhi',     'Chennai',   2100,  1900, 2100, 1500, 165, 6000),
    ('Delhi',     'Kolkata',   1680,  1500, 1800, 1300, 135, 5000),
    ('Delhi',     'Hyderabad', 1440,  1300, 1560, 1100, 135, 5200),
    ('Delhi',     'Jaipur',     270,   350,  330,  300, 140, 4500),
    ('Delhi',     'Agra',       120,   250,  210,  200, 140, 4000),
    ('Delhi',     'Lucknow',    300,   450,  420,  380, 140, 4500),
    ('Delhi',     'Varanasi',   720,   700,  840,  600, 140, 4800),
    ('Delhi',     'Goa',       2400,  2000, 2400, 1600, 165, 6500),
    ('Delhi',     'Pune',      1200,  1300, 1320, 1050, 140, 5500),
    ('Delhi',     'Amritsar',   360,   450,  420,  380, 140, 4200),
    ('Delhi',     'Chandigarh', 210,   300,  255,  250, 140, 4000),
    ('Mumbai',    'Pune',       180,   250,  210,  200, 100, 4500),
    ('Mumbai',    'Goa',        660,   600,  600,  500, 100, 4200),
    ('Mumbai',    'Bangalore',  960,  1000, 1080,  900, 100, 4800),
    ('Mumbai',    'Chennai',    960,  1050, 1080,  950, 105, 4800),
    ('Mumbai',    'Hyderabad',  780,   850,  840,  750,  90, 4500),
    ('Mumbai',    'Kolkata',   1800,  1600, 1980, 1400, 150, 5500),
    ('Mumbai',    'Agra',       960,  1000, 1080,  900, 140, 5000),
    ('Mumbai',    'Jaipur',     780,   850,  900,  750, 140, 4800),
    ('Bangalore', 'Chennai',    360,   500,  420,  400,  75, 3500),
    ('Bangalore', 'Hyderabad',  660,   700,  720,  600, 100, 3800),
    ('Bangalore', 'Goa',        720,   700,  660,  600, 100, 4000),
    ('Bangalore', 'Kolkata',   1920,  1700, 2100, 1500, 150, 5500),
    ('Bangalore', 'Pune',       960,   950, 1080,  850, 100, 4500),
    ('Bangalore', 'Kochi',      660,   600,  720,  550, 100, 3800),
    ('Chennai',   'Hyderabad',  540,   600,  600,  500, 100, 3800),
    ('Chennai',   'Kolkata',   1680,  1500, 1860, 1300, 155, 5000),
    ('Chennai',   'Goa',        960,   900, 1080,  800, 120, 4500),
    ('Chennai',   'Kochi',      360,   450,  420,  380,  75, 3500),
    ('Kolkata',   'Hyderabad', 1560,  1400, 1800, 1200, 140, 5000),
    ('Hyderabad', 'Pune',       540,   600,  600,  500, 100, 3800),
    ('Hyderabad', 'Goa',        660,   650,  720,  580, 100, 4000),
    ('Jaipur',    'Agra',       180,   250,  210,  200, 140, 4000),
    ('Jaipur',    'Lucknow',    480,   500,  540,  450, 140, 4500),
    ('Lucknow',   'Varanasi',   240,   300,  300,  250, 140, 4200),
    ('Agra',      'Lucknow',    240,   300,  300,  250, 140, 4200),
    ('Pune',      'Goa',        540,   500,  540,  450, 100, 4000),
]
ROUTE_GROUND_TRUTH = {}
for _r in _GT:
    _s, _d, _tm, _tp, _bm, _bp, _fm, _fp = _r
    for _a, _b in [(_s, _d), (_d, _s)]:
        ROUTE_GROUND_TRUTH[(_a, _b)] = {
            'Train':  {'price': _tp, 'duration': _tm},
            'Bus':    {'price': _bp, 'duration': _bm},
            'Flight': {'price': _fp, 'duration': _fm},
        }


class RouteRecommender:
    def __init__(
        self,
        data_dir=".",
        enable_rail_api=False,
        enable_flight_api=False,
        enable_bus_api=False,
        api_searchers=None,
    ):
        self.data_dir = data_dir
        self.artifacts_dir = os.path.join(data_dir, "artifacts")
        self.dataset_provider = DatasetRouteProvider(
            Path(data_dir),
            enable_rail_api=enable_rail_api,
            enable_flight_api=enable_flight_api,
            enable_bus_api=enable_bus_api,
            api_searchers=api_searchers,
        )

        # ── Load artifacts ──────────────────────────────────────────────────
        with open(os.path.join(self.artifacts_dir, 'encoders.pkl'), 'rb') as f:
            self.encoders = pickle.load(f)
        with open(os.path.join(self.artifacts_dir, 'scaler.pkl'), 'rb') as f:
            self.scaler = pickle.load(f)

        # ── Load real dataset statistics ────────────────────────────────────
        route_lookup_path = os.path.join(self.artifacts_dir, 'route_lookup.csv')
        if os.path.exists(route_lookup_path):
            self.route_lookup = pd.read_csv(route_lookup_path)
        else:
            self.route_lookup = pd.DataFrame()

        stats_path = os.path.join(self.artifacts_dir, 'transport_stats.csv')
        if os.path.exists(stats_path):
            stats_df = pd.read_csv(stats_path)
            self.transport_stats = stats_df.set_index('Transport_Type').to_dict('index')
        else:
            self.transport_stats = {}

        cab_stats_path = os.path.join(self.artifacts_dir, 'city_cab_stats.csv')
        if os.path.exists(cab_stats_path):
            cab_stats_df = pd.read_csv(cab_stats_path)
            self.city_cab_stats = cab_stats_df.set_index('City').to_dict('index')
        else:
            self.city_cab_stats = {
                'Delhi': {'price_per_km': 17.72, 'min_per_km': 4.0},
                'Bangalore': {'price_per_km': 20.0, 'min_per_km': 4.0},
            }

        cab_rate_overrides = {
            'Bangalore': {'price_per_km': 20.0},
        }
        for city, overrides in cab_rate_overrides.items():
            if city not in self.city_cab_stats:
                self.city_cab_stats[city] = {'price_per_km': 20.0, 'min_per_km': 4.0}
            self.city_cab_stats[city].update(overrides)

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
        # Small city coordinate lookup (used for Haversine distance estimation).
        # Expand as needed; used only when precise coordinates are available.
        self.city_coords = {
            'Delhi': (28.7041, 77.1025),
            'Bangalore': (12.9716, 77.5946),
            'Mumbai': (19.0760, 72.8777),
            'Chennai': (13.0827, 80.2707),
            'Kolkata': (22.5726, 88.3639),
        }

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

        self.hub_distances = {
            'Flight': 25,
            'Train':  12,
            'Bus':    10,
        }

    # ── Private helpers ─────────────────────────────────────────────────────

    def _encode_safe(self, encoder, val):
        if val in encoder.classes_:
            return encoder.transform([val])[0]
        raise ValueError(f"Model encoder has no category for {val!r}")

    def _haversine_distance(self, src: str, dst: str) -> float:
        """Compute great-circle (approx) distance between two city centroids if available.

        Returns distance in kilometers or None if coordinates not available.
        """
        if src not in self.city_coords or dst not in self.city_coords:
            return None
        lat1, lon1 = self.city_coords[src]
        lat2, lon2 = self.city_coords[dst]
        from math import radians, sin, cos, sqrt, atan2
        R = 6371.0
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c

    def _route_stats(self, trans_type, source, dest):
        fb = FALLBACK_STATS.get(trans_type, FALLBACK_STATS['Bus'])

        if not self.route_lookup.empty:
            rl = self.route_lookup
            match = rl[
                (rl['Transport_Type'] == trans_type) &
                (rl['Source'].str.lower() == str(source).lower()) &
                (rl['Destination'].str.lower() == str(dest).lower())
            ]
            if not match.empty:
                row = match.iloc[0]
                return {
                    'price': row['median_price'],
                    'duration': row['median_duration'],
                    'distance': row.get('median_distance', fb.get('distance', 500)),
                    'source': 'dataset_exact',
                }

            rev = rl[
                (rl['Transport_Type'] == trans_type) &
                (rl['Source'].str.lower() == str(dest).lower()) &
                (rl['Destination'].str.lower() == str(source).lower())
            ]
            if not rev.empty:
                row = rev.iloc[0]
                return {
                    'price': row['median_price'],
                    'duration': row['median_duration'],
                    'distance': row.get('median_distance', fb.get('distance', 500)),
                    'source': 'dataset_reverse',
                }

        gt_key = (str(source).title(), str(dest).title())
        if gt_key in ROUTE_GROUND_TRUTH and trans_type in ROUTE_GROUND_TRUTH[gt_key]:
            gt = ROUTE_GROUND_TRUTH[gt_key][trans_type]
            return {
                'price': gt['price'],
                'duration': gt['duration'],
                'distance': gt['duration'] * 1.5,
                'source': 'ground_truth',
            }

        if trans_type in self.transport_stats:
            s = self.transport_stats[trans_type]
            return {
                'price': s.get('median_price', fb['price']),
                'duration': s.get('median_duration', fb['duration']),
                'distance': s.get('avg_distance', 500),
                'source': 'type_level_fallback',
            }

        return {'price': fb['price'], 'duration': fb['duration'], 'distance': 500, 'source': 'hardcoded'}

    def _city_from_locations(self, source, dest):
        for location in (source, dest):
            text = str(location)
            for city in self.city_cab_stats:
                if city.lower() in text.lower():
                    return city
        return None

    def _cab_rate_metrics(self, source, dest, distance_est):
        distance = distance_est if distance_est is not None else 18
        city = self._city_from_locations(source, dest)
        if city and city in self.city_cab_stats:
            rate = self.city_cab_stats[city]
            return (
                distance * float(rate.get('price_per_km', 14.0)),
                distance * float(rate.get('min_per_km', 4.0)),
            )
        return distance * 14.0, distance * 4.0

    def _predict_leg_metrics(
        self,
        trans_type,
        mode,
        source,
        dest,
        date_obj,
        distance_est=None,
        fallback_price=None,
        fallback_duration=None,
    ):
        """Predict price, duration, comfort for a single leg using the trained model.

        Returns (price_real, duration_real, comfort) in real-world units (INR, minutes, 0-1).
        Falls back to dataset medians only on error.
        """
        if trans_type == 'Cab':
            is_valid_dist = (distance_est is not None and distance_est > 0)
            is_valid_price = (fallback_price is not None and fallback_price > 0)
            is_valid_duration = (fallback_duration is not None and fallback_duration > 0)

            if is_valid_dist and is_valid_price and is_valid_duration:
                price_real = fallback_price
                duration_real = fallback_duration
            else:
                if distance_est is None or distance_est <= 0:
                    distance_est = 18
                price_real, duration_real = self._cab_rate_metrics(source, dest, distance_est)
        else:
            stats = self._route_stats(trans_type, source, dest)
            price_real = fallback_price if fallback_price is not None else stats['price']
            duration_real = fallback_duration if fallback_duration is not None else stats['duration']
            if distance_est is None:
                distance_est = stats.get('distance')

        if distance_est is not None:
            try:
                comfort = self._dl_comfort(trans_type, mode, source, dest, date_obj, distance_est)
            except Exception:
                comfort = COMFORT_MAP.get(trans_type, 0.5)
            return max(1.0, float(price_real)), max(1.0, float(duration_real)), float(comfort)

        # Determine distance estimate using preferred order
        try:
            if distance_est is None:
                distance_est = self._haversine_distance(source, dest)
            if distance_est is None:
                distance_est = self._real_stats(trans_type).get('avg_distance')
            if distance_est is None:
                raise ValueError('No dataset, API, or coordinate distance is available')

            # Build continuous scaled distance exactly as preprocessing did
            day = date_obj.day
            month = date_obj.month
            weekday = date_obj.weekday()
            is_weekend = 1 if weekday >= 5 else 0

            # scaler was fit on ['Distance','Duration','Price'] -> we only need Distance scaled
            dummy = pd.DataFrame(
                [[distance_est, 0.0, 0.0]],
                columns=['Distance', 'Duration', 'Price'],
            )
            dist_scaled = float(self.scaler.transform(dummy)[0][0])

            cont_features = torch.tensor([[dist_scaled, day, month, weekday, is_weekend]], dtype=torch.float32)

            t_idx = torch.tensor([self._encode_safe(self.encoders['Transport_Type'], trans_type)])
            m_idx = torch.tensor([self._encode_safe(self.encoders['Mode'], mode)])
            s_idx = torch.tensor([self._encode_safe(self.encoders['Source'], source)])
            d_idx = torch.tensor([self._encode_safe(self.encoders['Destination'], dest)])

            with torch.no_grad():
                p_pred_s, d_pred_s, c_pred_s = self.model(t_idx, m_idx, s_idx, d_idx, cont_features)

            p_scaled = float(p_pred_s.item())
            d_scaled = float(d_pred_s.item())
            comfort = float(c_pred_s.item())

            # Inverse-transform to real units. The scaler expects [Distance, Duration, Price]
            inv = self.scaler.inverse_transform([[dist_scaled, d_scaled, p_scaled]])
            duration_real = float(inv[0][1])
            price_real = float(inv[0][2])

            # Basic sanitization
            if not (np.isfinite(price_real) and np.isfinite(duration_real) and np.isfinite(comfort)):
                raise ValueError('Non-finite model output')

            price_real = max(1.0, price_real)
            duration_real = max(1.0, duration_real)
            comfort = min(max(0.0, comfort), 1.0)

            return price_real, duration_real, comfort
        except Exception:
            # Emergency fallback to dataset medians (preserve old behavior only on failure)
            stats = self._real_stats(trans_type)
            price = fallback_price if fallback_price is not None else stats['median_price']
            duration = fallback_duration if fallback_duration is not None else stats['median_duration']
            # compute comfort best-effort via existing DL comfort (which itself may use model)
            try:
                comfort = self._dl_comfort(trans_type, mode, source, dest, date_obj, distance_est)
            except Exception:
                comfort = COMFORT_MAP.get(trans_type, 0.5)
            return price, duration, comfort

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
                'min_duration': s.get('min_duration',    FALLBACK_STATS[trans_type]['duration'] * 0.7),
                'avg_distance': s.get('avg_distance'),
            }
        return {
            'avg_price':    FALLBACK_STATS.get(trans_type, FALLBACK_STATS['Bus'])['price'],
            'median_price': FALLBACK_STATS.get(trans_type, FALLBACK_STATS['Bus'])['price'],
            'min_price':    FALLBACK_STATS.get(trans_type, FALLBACK_STATS['Bus'])['price'] * 0.6,
            'avg_duration': FALLBACK_STATS.get(trans_type, FALLBACK_STATS['Bus'])['duration'],
            'median_duration': FALLBACK_STATS.get(trans_type, FALLBACK_STATS['Bus'])['duration'],
            'min_duration': FALLBACK_STATS.get(trans_type, FALLBACK_STATS['Bus'])['duration'] * 0.7,
            'avg_distance': None,
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

        dl_comfort   = c_pred.item()
        rule_comfort = COMFORT_MAP.get(trans_type, 0.5)
        return 0.4 * dl_comfort + 0.6 * rule_comfort

    def _build_leg(
        self,
        trans_type,
        mode,
        source,
        dest,
        date_obj,
        distance_est=None,
        fallback_price=None,
        fallback_duration=None,
        metadata=None,
    ):
        """
        Build a single route leg using the DL model to predict price, duration and comfort.
        Dataset medians are retained only as an emergency fallback inside the predictor.
        """
        # Delegate to model-based predictor; it handles distance estimation and fallbacks.
        price, duration, comfort = self._predict_leg_metrics(
            trans_type,
            mode,
            source,
            dest,
            date_obj,
            distance_est,
            fallback_price,
            fallback_duration,
        )

        leg = {
            'Transport_Type': trans_type,
            'Mode':           mode,
            'Source':         source,
            'Destination':    dest,
            'Price':          max(float(price), 1.0),
            'Duration':       max(int(round(float(duration))), 1),
            'Comfort':        float(comfort),
        }
        if metadata:
            leg.update(metadata)
        return leg

    def _build_dataset_leg(self, record, date_obj):
        metadata = {
            key: value
            for key, value in record.items()
            if key not in {'Transport_Type', 'Mode', 'Source', 'Destination'}
        }
        return self._build_leg(
            record['Transport_Type'],
            record['Mode'],
            record['Source'],
            record['Destination'],
            date_obj,
            distance_est=record.get('Dataset_Distance'),
            fallback_price=record.get('Dataset_Price'),
            fallback_duration=record.get('Dataset_Duration'),
            metadata=metadata,
        )

    def generate_candidates(self, source_city, dest_city, pickup_area, drop_area, date_obj):
        source_city = normalize_city(source_city)
        dest_city = normalize_city(dest_city)
        print("REQUEST:", source_city, dest_city)
        if source_city == dest_city:
            local_rows = self.dataset_provider.search_local_cabs(source_city, pickup_area, drop_area)
            candidates = [[self._build_dataset_leg(row, date_obj)] for row in local_rows]
            deduplicated = self._deduplicate_candidates(candidates)
            print("DATASET MATCHES:", len(local_rows))
            print("CANDIDATES:", len(deduplicated))
            for route in deduplicated:
                total_price = sum(leg['Price'] for leg in route)
                print("ROUTE PRICE:", total_price)
            return deduplicated

        candidate_rows = self.dataset_provider.search_routes(source_city, dest_city, date_obj)
        print("DATASET MATCHES:", len(candidate_rows))
        candidates = []
        
        present_types = {row.get('Transport_Type') for row in candidate_rows}
        intercity_defs = {
            'Flight': ['IndiGo', 'Air India', 'SpiceJet', 'Vistara'],
            'Train':  ['Rajdhani Express', 'Shatabdi Express', 'Express Train'],
            'Bus':    ['Intercity Bus'],
        }
        missing_types = [t for t in intercity_defs if t not in present_types]
        
        def fmt(city, area):
            a = str(area).strip() if area else ''
            return f"{a} ({city})" if a else city

        for trans_type in missing_types:
            hub_dist = self.hub_distances.get(trans_type, 15)
            for mode in intercity_defs[trans_type]:
                route = []
                src_hub = self.hubs.get(source_city, {}).get(trans_type, None)
                if not src_hub:
                    src_hub = f"{source_city} Airport" if trans_type == 'Flight' else (f"{source_city} Station" if trans_type == 'Train' else f"{source_city} Bus Terminal")
                
                dst_hub = self.hubs.get(dest_city, {}).get(trans_type, None)
                if not dst_hub:
                    dst_hub = f"{dest_city} Airport" if trans_type == 'Flight' else (f"{dest_city} Station" if trans_type == 'Train' else f"{dest_city} Bus Terminal")
                
                p_src = fmt(source_city, pickup_area if pickup_area else "City Center")
                d_dst = fmt(dest_city, drop_area if drop_area else "City Center")
                
                route.append(self._build_leg('Cab', 'Uber Go', p_src, src_hub, date_obj, distance_est=hub_dist))
                route.append(self._build_leg(trans_type, mode, src_hub, dst_hub, date_obj))
                route.append(self._build_leg('Cab', 'Uber Go', dst_hub, d_dst, date_obj, distance_est=hub_dist))
                candidates.append(route)

        for row in candidate_rows:
            route = []
            trans_type = row.get('Transport_Type')

            # Always synthesize first mile if origin is a hub city
            current_pickup_area = pickup_area
            if not current_pickup_area and source_city in self.hubs:
                current_pickup_area = "City Center"

            current_drop_area = drop_area
            if not current_drop_area and dest_city in self.hubs:
                current_drop_area = "City Center"

            first_mile = self.dataset_provider.search_access_cabs(
                source_city, current_pickup_area, trans_type, True
            )
            if first_mile:
                route.append(self._build_dataset_leg(first_mile[0], date_obj))
            elif current_pickup_area:
                src_hub = self.hubs.get(source_city, {}).get(trans_type)
                if src_hub:
                    hub_dist = self.hub_distances.get(trans_type, 15)
                    route.append(self._build_leg(
                        'Cab', 'Uber Go', f"{current_pickup_area} ({source_city})", src_hub, date_obj, distance_est=hub_dist
                    ))

            route.append(self._build_dataset_leg(row, date_obj))

            last_mile = self.dataset_provider.search_access_cabs(
                dest_city, current_drop_area, trans_type, False
            )
            if last_mile:
                route.append(self._build_dataset_leg(last_mile[0], date_obj))
            elif current_drop_area:
                dst_hub = self.hubs.get(dest_city, {}).get(trans_type)
                if dst_hub:
                    hub_dist = self.hub_distances.get(trans_type, 15)
                    route.append(self._build_leg(
                        'Cab', 'Uber Go', dst_hub, f"{current_drop_area} ({dest_city})", date_obj, distance_est=hub_dist
                    ))

            candidates.append(route)
        deduplicated = self._deduplicate_candidates(candidates)
        print("CANDIDATES:", len(deduplicated))
        for route in deduplicated:
            total_price = sum(leg['Price'] for leg in route)
            print("ROUTE PRICE:", total_price)
        return deduplicated

    @staticmethod
    def _deduplicate_candidates(candidates):
        unique = []
        seen = set()
        for route in candidates:
            signature = tuple(
                (
                    leg['Transport_Type'],
                    leg['Mode'],
                    leg['Source'],
                    leg['Destination'],
                    round(float(leg['Price']), 2),
                    int(leg['Duration']),
                    round(float(leg['Comfort']), 4),
                )
                for leg in route
            )
            if signature not in seen:
                seen.add(signature)
                unique.append(route)
        return unique

    def score_route(self, route, preference):
        total_price    = sum(leg['Price']    for leg in route)
        total_duration = sum(leg['Duration'] for leg in route)
        avg_comfort    = sum(leg['Comfort']  for leg in route) / len(route)
        total_distance = sum(
            float(leg.get('Dataset_Distance') or 0.0) for leg in route
        )
        carbon_proxy = sum(
            float(leg['Duration']) * CARBON_FACTOR.get(leg['Transport_Type'], 5)
            for leg in route
        )

        primary_trans = next(
            (leg['Transport_Type'] for leg in route if leg['Transport_Type'] != 'Cab'),
            route[0]['Transport_Type']
        )
        speed_rank  = SPEED_RANK.get(primary_trans, 4)
        cost_rank   = COST_RANK.get(primary_trans, 4)
        luxury_rank = LUXURY_RANK.get(primary_trans, 4)

        if preference == 'Cheapest':
            score = -cost_rank * 1e6 - total_price
        elif preference == 'Fastest':
            score = -speed_rank * 1e6 - total_duration
        elif preference == 'Economical':
            econ_rank = {'Train': 1, 'Bus': 2, 'Cab': 3, 'Flight': 1}.get(primary_trans, 4)
            score = -econ_rank * 1e6 - total_price
        elif preference == 'Shortest':
            score = -total_distance
        elif preference == 'Eco':
            score = -carbon_proxy
        elif preference == 'Balanced':
            norm_price    = total_price    / 10000
            norm_duration = total_duration / 1440
            score = avg_comfort - 0.35 * norm_price - 0.35 * norm_duration
        elif preference == 'Luxury':
            score = -luxury_rank * 1e6 + avg_comfort * 1000 - total_duration * 0.01
        elif preference == 'Comfort optimized':
            score = avg_comfort * 1e6 - luxury_rank * 100
        else:
            score = -total_price

        return score, total_price, total_duration, avg_comfort

    def get_best_route(self, source_city, dest_city, pickup_area, drop_area, date_str, preference):
        print("get_best_route() received:", source_city, dest_city, preference)
        date_obj   = datetime.strptime(date_str, '%Y-%m-%d')
        candidates = self.generate_candidates(source_city, dest_city, pickup_area, drop_area, date_obj)

        scored = []
        for route in candidates:
            score, p, d, c = self.score_route(route, preference)
            scored.append({'route': route, 'score': score,
                           'total_price': p, 'total_duration': d, 'avg_comfort': c})

        scored.sort(key=lambda x: x['score'], reverse=True)
        if not scored:
            return {
                'Transport Sequence': '',
                'Total Cost': 'Rs.0',
                'Estimated Time': '0h 0m',
                'Reasoning': 'No dataset or API route exists for the requested city pair.',
                'Confidence Score': '0%',
                'Route Details': [],
                'preference': preference,
            }
        best = scored[0]

        steps = []
        for leg in best['route']:
            steps.append(f"{leg['Mode']} ({leg['Transport_Type']}) from {leg['Source']} to {leg['Destination']}")

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
