import unittest
from datetime import datetime
from pathlib import Path
from tempfile import TemporaryDirectory

import pandas as pd

from app.schemas.route_schemas import PlanRouteRequest, PlanRouteResponse
from app.services.ai_service import AIService
from recommend import RouteRecommender
from route_providers import BusProvider, DatasetRouteProvider, RailProvider, STATION_CODES


BACKEND_DIR = Path(__file__).resolve().parents[1]
TRAVEL_DATE = datetime(2026, 6, 10)


class DatasetRouteGenerationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.provider = DatasetRouteProvider(BACKEND_DIR)
        cls.recommender = RouteRecommender(str(BACKEND_DIR))

    def test_delhi_bangalore_routes_are_dataset_rows(self):
        routes = self.provider.search_routes("Delhi", "Bangalore", TRAVEL_DATE)

        self.assertTrue(routes)
        self.assertTrue(all(route["Dataset_Source"] == "finalrailways.csv" for route in routes))
        self.assertTrue(all(route["Origin_Code"] in STATION_CODES["Delhi"] for route in routes))
        self.assertTrue(all(route["Destination_Code"] in STATION_CODES["Bangalore"] for route in routes))

    def test_city_pairs_produce_different_candidate_sets(self):
        bangalore = self.provider.search_routes("Delhi", "Bangalore", TRAVEL_DATE)
        mumbai = self.provider.search_routes("Delhi", "Mumbai", TRAVEL_DATE)

        bangalore_ids = {
            (route["Transport_Type"], route["Mode"], route["Dataset_Record_ID"])
            for route in bangalore
        }
        mumbai_ids = {
            (route["Transport_Type"], route["Mode"], route["Dataset_Record_ID"])
            for route in mumbai
        }
        self.assertTrue(bangalore_ids)
        self.assertTrue(mumbai_ids)
        self.assertNotEqual(bangalore_ids, mumbai_ids)

    def test_reverse_routes_and_no_route_behavior(self):
        self.assertTrue(
            self.provider.search_routes("Bangalore", "Delhi", TRAVEL_DATE)
        )
        self.assertTrue(
            self.provider.search_routes("Mumbai", "Delhi", TRAVEL_DATE)
        )
        self.assertEqual(
            self.provider.search_routes("Delhi", "Atlantis", TRAVEL_DATE),
            [],
        )
        self.assertEqual(
            self.recommender.generate_candidates(
                "Delhi", "Atlantis", "", "", TRAVEL_DATE
            ),
            [],
        )

    def test_city_matching_is_case_insensitive_and_normalizes_aliases(self):
        lower_case = self.provider.search_routes("delhi", "banglore", TRAVEL_DATE)
        canonical = self.provider.search_routes("Delhi", "Bangalore", TRAVEL_DATE)

        self.assertEqual(
            {(route["Dataset_Source"], route["Dataset_Record_ID"]) for route in lower_case},
            {(route["Dataset_Source"], route["Dataset_Record_ID"]) for route in canonical},
        )
        self.assertIn("Kochi", self.provider.available_cities())
        self.assertNotIn("Cochin", self.provider.available_cities())

    def test_modes_are_read_from_source_datasets(self):
        railway = pd.read_csv(self.provider.dataset_dir / "finalrailways.csv")
        airway = pd.read_csv(self.provider.dataset_dir / "finalairways.csv")

        train_modes = set(railway["trainNumber"].dropna().astype(int).astype(str))
        flight_modes = set(airway["Airline"].dropna().astype(str).str.strip())
        train_routes = self.provider.search_routes("Delhi", "Bangalore", TRAVEL_DATE)
        flight_routes = self.provider.search_routes("Bangalore", "Delhi", TRAVEL_DATE)

        self.assertTrue(all(route["Mode"] in train_modes for route in train_routes))
        self.assertTrue(
            all(route["Mode"] in flight_modes for route in flight_routes if route["Transport_Type"] == "Flight")
        )
        bus_routes = self.provider.search_routes("Delhi", "Mumbai", TRAVEL_DATE)
        self.assertTrue(
            all(
                route["Mode"] == "Delhi-Mumbai Dataset Bus Route"
                for route in bus_routes
                if route["Transport_Type"] == "Bus"
            )
        )

    def test_candidate_generation_calls_model_after_discovery(self):
        calls = []
        original = self.recommender._predict_leg_metrics

        def fake_predict(
            transport_type,
            mode,
            source,
            destination,
            date_obj,
            distance_est=None,
            fallback_price=None,
            fallback_duration=None,
        ):
            calls.append((transport_type, mode, distance_est, fallback_price, fallback_duration))
            return 100.0, 60.0, 0.8

        self.recommender._predict_leg_metrics = fake_predict
        try:
            candidates = self.recommender.generate_candidates(
                "Delhi", "Bangalore", "", "", TRAVEL_DATE
            )
        finally:
            self.recommender._predict_leg_metrics = original

        self.assertTrue(candidates)
        self.assertGreaterEqual(len(calls), len(candidates))
        self.assertTrue(all(call[2] is not None for call in calls))
        score, price, duration, comfort = self.recommender.score_route(candidates[0], "Balanced")
        self.assertIsInstance(score, float)
        self.assertEqual((price, duration, comfort), (100.0, 60, 0.8))

    def test_generated_candidates_are_unique_and_traceable(self):
        for source, destination in (
            ("Delhi", "Bangalore"),
            ("Delhi", "Mumbai"),
            ("Bangalore", "Delhi"),
            ("Mumbai", "Delhi"),
        ):
            candidates = self.recommender.generate_candidates(
                source, destination, "", "", TRAVEL_DATE
            )
            signatures = {
                tuple(
                    (
                        leg["Transport_Type"],
                        leg["Mode"],
                        round(leg["Price"], 2),
                        leg["Duration"],
                        round(leg["Comfort"], 4),
                    )
                    for leg in route
                )
                for route in candidates
            }
            self.assertEqual(len(candidates), len(signatures))
            self.assertTrue(
                all(
                    leg.get("Dataset_Source") and leg.get("Dataset_Record_ID") is not None
                    for route in candidates
                    for leg in route
                )
            )

    def test_unknown_model_category_uses_dataset_values_instead_of_encoder_zero(self):
        bus_rows = [
            row
            for row in self.provider.search_routes("Delhi", "Mumbai", TRAVEL_DATE)
            if row["Transport_Type"] == "Bus"
        ]
        self.assertTrue(bus_rows)

        leg = self.recommender._build_dataset_leg(bus_rows[0], TRAVEL_DATE)

        self.assertEqual(leg["Price"], bus_rows[0]["Dataset_Price"])
        self.assertEqual(leg["Duration"], round(bus_rows[0]["Dataset_Duration"]))

    def test_correct_model_rankings_drive_preference_ranking(self):
        cheap_slow_flight = [{
            "Transport_Type": "Flight",
            "Mode": "a",
            "Price": 100.0,
            "Duration": 300,
            "Comfort": 0.5,
        }]
        expensive_fast_bus = [{
            "Transport_Type": "Bus",
            "Mode": "b",
            "Price": 1000.0,
            "Duration": 30,
            "Comfort": 0.5,
        }]
        expensive_slow_flight = [{
            "Transport_Type": "Flight",
            "Mode": "c",
            "Price": 1000.0,
            "Duration": 600,
            "Comfort": 0.5,
        }]

        self.assertGreater(
            self.recommender.score_route(expensive_fast_bus, "Cheapest")[0],
            self.recommender.score_route(cheap_slow_flight, "Cheapest")[0],
        )
        self.assertGreater(
            self.recommender.score_route(cheap_slow_flight, "Fastest")[0],
            self.recommender.score_route(expensive_fast_bus, "Fastest")[0],
        )
        self.assertGreater(
            self.recommender.score_route(cheap_slow_flight, "Fastest")[0],
            self.recommender.score_route(expensive_slow_flight, "Fastest")[0],
        )

    def test_shortest_and_eco_preferences_use_route_metrics(self):
        short_flight = [{
            "Transport_Type": "Flight",
            "Mode": "a",
            "Price": 500.0,
            "Duration": 100,
            "Comfort": 0.5,
            "Dataset_Distance": 100,
        }]
        long_train = [{
            "Transport_Type": "Train",
            "Mode": "b",
            "Price": 500.0,
            "Duration": 200,
            "Comfort": 0.5,
            "Dataset_Distance": 500,
        }]

        self.assertGreater(
            self.recommender.score_route(short_flight, "Shortest")[0],
            self.recommender.score_route(long_train, "Shortest")[0],
        )
        self.assertGreater(
            self.recommender.score_route(long_train, "Eco")[0],
            self.recommender.score_route(short_flight, "Eco")[0],
        )

    def test_bus_provider_handles_missing_operator_and_duplicate_rows(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "buses.csv"
            pd.DataFrame(
                [
                    {
                        "Source": "Delhi",
                        "Destination": "Mumbai",
                        "distance": 1400,
                        "price": 2000,
                        "Travel Duration": "20hrs 00mins",
                    },
                    {
                        "Source": "Delhi",
                        "Destination": "Mumbai",
                        "distance": 1400,
                        "price": 2000,
                        "Travel Duration": "20hrs 00mins",
                    },
                ]
            ).to_csv(path, index=False)
            routes = BusProvider(path).search_routes(
                "delhi", "mumbai", TRAVEL_DATE
            )

        self.assertEqual(len(routes), 1)
        self.assertEqual(routes[0]["Mode"], "Delhi-Mumbai Dataset Bus Route")

    def test_api_results_take_priority_and_empty_api_falls_back_to_dataset(self):
        api_record = {
            "Transport_Type": "Train",
            "Mode": "api-record",
            "Source": "Delhi",
            "Destination": "Bangalore",
            "Dataset_Distance": 2100.0,
            "Dataset_Price": 1200.0,
            "Dataset_Duration": 900.0,
            "Dataset_Source": "rail-api",
            "Dataset_Record_ID": "api-1",
        }
        dataset_path = self.provider.dataset_dir / "finalrailways.csv"
        api_provider = RailProvider(
            dataset_path,
            api_enabled=True,
            api_search=lambda source, destination, date: [api_record],
        )
        fallback_provider = RailProvider(
            dataset_path,
            api_enabled=True,
            api_search=lambda source, destination, date: [],
        )

        self.assertEqual(
            api_provider.search_routes("Delhi", "Bangalore", TRAVEL_DATE),
            [api_record],
        )
        self.assertTrue(
            fallback_provider.search_routes("Delhi", "Bangalore", TRAVEL_DATE)
        )

    def test_fastapi_response_contract_and_frontend_modes_are_preserved(self):
        service = AIService(BACKEND_DIR)
        request = PlanRouteRequest(
            origin="Delhi",
            destination="Bangalore",
            travel_date="2026-06-10",
            travelers={
                "adults": 1,
                "children": 0,
                "seniors": 0,
                "pwd": 0,
                "bags": 1,
            },
            mode="ECONOMIC",
            accessibility=False,
            detour_city=None,
        )

        response = service.plan_routes(request)

        self.assertIsInstance(response, PlanRouteResponse)
        self.assertTrue(response.routes)
        self.assertTrue(
            all(
                segment.mode in {"train", "bus", "flight", "cab"}
                for route in response.routes
                for segment in route.segments
            )
        )
        route_signatures = {
            tuple(
                (
                    segment.class_type,
                    segment.operator,
                    segment.fare_inr,
                    segment.duration_minutes,
                )
                for segment in route.segments
            )
            for route in response.routes
        }
        self.assertEqual(len(response.routes), len(route_signatures))

    def test_normalize_city_scenarios(self):
        # Scenario 1: Delhi -> Mumbai
        routes_1 = self.provider.search_routes("Delhi", "Mumbai", TRAVEL_DATE)
        self.assertTrue(routes_1)

        # Scenario 2: Delhi · Indira Gandhi International Airport -> Mumbai
        routes_2 = self.provider.search_routes("Delhi · Indira Gandhi International Airport", "Mumbai", TRAVEL_DATE)
        self.assertTrue(routes_2)
        self.assertEqual(
            {(r["Transport_Type"], r["Mode"], r["Dataset_Record_ID"]) for r in routes_1},
            {(r["Transport_Type"], r["Mode"], r["Dataset_Record_ID"]) for r in routes_2}
        )

        # Scenario 3: Bengaluru -> Delhi
        routes_3 = self.provider.search_routes("Bengaluru", "Delhi", TRAVEL_DATE)
        self.assertTrue(routes_3)

    def test_removed_templates_do_not_exist_in_active_source(self):
        fragments = [
            ("Rajdhani", " Express"),
            ("Shatabdi", " Express"),
            ("Express", " Train"),
            ("Intercity", " Bus"),
        ]
        source = "\n".join(
            path.read_text(encoding="utf-8")
            for path in BACKEND_DIR.rglob("*.py")
            if "tests" not in path.parts and ".venv" not in path.parts
        )
        for left, right in fragments:
            self.assertNotIn(left + right, source)


if __name__ == "__main__":
    unittest.main()
