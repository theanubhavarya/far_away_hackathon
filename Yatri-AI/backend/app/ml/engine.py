from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

from app.core.config import MODEL_DIR
from app.utils.helpers import clean_city


class RouteEngine:
    def __init__(self, model_dir: Path = MODEL_DIR):
        self.model_dir = model_dir
        if str(model_dir) not in sys.path:
            sys.path.insert(0, str(model_dir))
        from recommend import RouteRecommender

        self.recommender = RouteRecommender(data_dir=str(model_dir))

    def get_all_scored_routes(
        self,
        origin: str,
        destination: str,
        travel_date: str,
        preference: str,
        pickup_area: str = "",
        drop_area: str = "",
    ) -> list[dict]:
        source_city = clean_city(origin)
        dest_city = clean_city(destination)
        date_obj = datetime.strptime(travel_date, "%Y-%m-%d")
        candidates = self.recommender.generate_candidates(
            source_city, dest_city, pickup_area, drop_area, date_obj
        )

        scored = []
        for route in candidates:
            score, price, duration, comfort = self.recommender.score_route(route, preference)
            scored.append(
                {
                    "route": route,
                    "score": float(score),
                    "total_price": float(price),
                    "total_duration": float(duration),
                    "avg_comfort": float(comfort),
                }
            )
        scored.sort(key=lambda item: item["score"], reverse=True)
        return scored


engine: RouteEngine | None = None


def load_engine() -> RouteEngine:
    global engine
    if engine is None:
        engine = RouteEngine()
    return engine
