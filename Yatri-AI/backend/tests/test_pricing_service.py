import unittest
import sys
from pathlib import Path

# Ensure backend root is in sys.path
backend_dir = str(Path(__file__).resolve().parents[1])
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services.pricing_service import (
    calculate_total_fare,
    get_travellers_count,
    calculate_segment_fare,
    apply_pricing_to_route
)
from app.schemas.route_schemas import RouteOption, RouteSegment, CostBreakdown, Stop, AccessibilityInfo

class PricingServiceTests(unittest.TestCase):
    def test_calculate_total_fare(self):
        self.assertEqual(calculate_total_fare(635, 4), 2540)
        self.assertEqual(calculate_total_fare(0, 10), 0)
        self.assertEqual(calculate_total_fare(100, 1), 100)

    def test_get_travellers_count_valid(self):
        # Dictionary config
        cfg1 = {'adults': 2, 'children': 1, 'seniors': 1, 'pwd': 0, 'bags': 2}
        self.assertEqual(get_travellers_count(cfg1), 4)

        # Class with attributes
        class DummyConfig:
            def __init__(self):
                self.adults = 1
                self.children = 2
                self.seniors = 0
                self.pwd = 1
                self.bags = 3
        self.assertEqual(get_travellers_count(DummyConfig()), 4)

    def test_get_travellers_count_defensive(self):
        # Missing traveler fields
        self.assertEqual(get_travellers_count(None), 1)
        self.assertEqual(get_travellers_count({}), 1)
        
        # Invalid values
        self.assertEqual(get_travellers_count({'adults': 'invalid', 'children': 2}), 3)  # adults defaults to 1, children=2 -> 3
        self.assertEqual(get_travellers_count({'adults': 0, 'children': 0}), 1)  # must be >= 1
        self.assertEqual(get_travellers_count({'adults': -5}), 1)  # total < 1 -> 1

    def test_calculate_segment_fare(self):
        # per-traveler pricing modes
        self.assertEqual(calculate_segment_fare('train', 500, 4), 2000)
        self.assertEqual(calculate_segment_fare('bus', 300, 3), 900)
        self.assertEqual(calculate_segment_fare('flight', 5000, 2), 10000)
        
        # vehicle-level pricing modes
        self.assertEqual(calculate_segment_fare('cab', 800, 4), 800)
        self.assertEqual(calculate_segment_fare('taxi', 1200, 3), 1200)

    def test_apply_pricing_to_route(self):
        # Set up a mock Stop and Segments
        stop = Stop(
            city="Delhi", station_name="Delhi Hub", station_code="DEL",
            latitude=28.5, longitude=77.2, terminal_info=""
        )
        
        segment_train = RouteSegment(
            segment_id="seg_train", origin_stop=stop, destination_stop=stop,
            mode="train", operator="Shatabdi", class_type="AC",
            departure_time="08:00", arrival_time="12:00", duration_minutes=240,
            fare_inr=500, platform_info="Platform 1", carbon_grams=200
        )
        
        segment_cab = RouteSegment(
            segment_id="seg_cab", origin_stop=stop, destination_stop=stop,
            mode="cab", operator="Uber", class_type="Premium",
            departure_time="12:05", arrival_time="12:35", duration_minutes=30,
            fare_inr=300, platform_info="Pickup A", carbon_grams=50
        )
        
        breakdown = CostBreakdown(
            transport_total_inr=800, estimated_local_cab_inr=0, estimated_food_inr=150,
            optional_fees_inr=0, total_min_inr=950, total_max_inr=1100,
            segment_breakdown={"seg_train": 500, "seg_cab": 300}
        )
        
        route = RouteOption(
            route_id="route_123", segments=[segment_train, segment_cab],
            total_time_minutes=270, total_cost_inr=950, cost_breakdown=breakdown,
            comfort_score=4.5, reliability_score=0.9, carbon_grams=250,
            tags=[], departure_time="08:00", arrival_time="12:35"
        )
        
        # Apply pricing for 4 travellers
        apply_pricing_to_route(route, {'adults': 4, 'children': 0, 'seniors': 0, 'pwd': 0, 'bags': 1})
        
        # Train segment should be scaled: 500 * 4 = 2000
        self.assertEqual(route.segments[0].fare_inr, 2000)
        # Cab segment should remain unchanged: 300
        self.assertEqual(route.segments[1].fare_inr, 300)
        
        # Validate cost breakdown
        # transport total = 2000 + 300 = 2300
        # food = 150 * 4 = 600
        # total_min = 2300 (transport) + 0 (cab) + 600 (food) + 0 (fees) = 2900
        self.assertEqual(route.cost_breakdown.transport_total_inr, 2300)
        self.assertEqual(route.cost_breakdown.estimated_food_inr, 600)
        self.assertEqual(route.cost_breakdown.total_min_inr, 2900)
        
        # Validate fields required by API response contract
        self.assertEqual(route.total_fare, 2900)
        self.assertEqual(route.fare_per_person, 725.0)
        self.assertEqual(route.travellers, 4)

    def test_apply_pricing_to_route_fractional(self):
        stop = Stop(
            city="Delhi", station_name="Delhi Hub", station_code="DEL",
            latitude=28.5, longitude=77.2, terminal_info=""
        )
        segment_train = RouteSegment(
            segment_id="seg_train", origin_stop=stop, destination_stop=stop,
            mode="train", operator="Shatabdi", class_type="AC",
            departure_time="08:00", arrival_time="12:00", duration_minutes=240,
            fare_inr=500, platform_info="Platform 1", carbon_grams=200
        )
        segment_cab = RouteSegment(
            segment_id="seg_cab", origin_stop=stop, destination_stop=stop,
            mode="cab", operator="Uber", class_type="Premium",
            departure_time="12:05", arrival_time="12:35", duration_minutes=30,
            fare_inr=290, platform_info="Pickup A", carbon_grams=50
        )
        breakdown = CostBreakdown(
            transport_total_inr=790, estimated_local_cab_inr=0, estimated_food_inr=25,
            optional_fees_inr=0, total_min_inr=815, total_max_inr=1100,
            segment_breakdown={"seg_train": 500, "seg_cab": 290}
        )
        route = RouteOption(
            route_id="route_123", segments=[segment_train, segment_cab],
            total_time_minutes=270, total_cost_inr=815, cost_breakdown=breakdown,
            comfort_score=4.5, reliability_score=0.9, carbon_grams=250,
            tags=[], departure_time="08:00", arrival_time="12:35"
        )
        
        apply_pricing_to_route(route, {'adults': 4, 'children': 0, 'seniors': 0, 'pwd': 0, 'bags': 1})
        self.assertEqual(route.total_fare, 2390)
        self.assertEqual(route.fare_per_person, 597.5)
        self.assertEqual(route.travellers, 4)

if __name__ == '__main__':
    unittest.main()
