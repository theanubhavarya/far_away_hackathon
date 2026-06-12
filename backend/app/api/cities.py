from fastapi import APIRouter, Query

from app.schemas import CitySearchResult
from app.services.city_service import search_cities

router = APIRouter(prefix="/api/v1/cities", tags=["cities"])


@router.get("/search", response_model=list[CitySearchResult])
def search(q: str = Query(default="")):
    return search_cities(q)
