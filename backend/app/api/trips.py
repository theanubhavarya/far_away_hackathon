from fastapi import APIRouter, HTTPException

from app.schemas import BookingConfirmation, BookingPayload
from app.services.booking_service import create_booking, get_booking

router = APIRouter(prefix="/api/v1/trips", tags=["trips"])


@router.post("", response_model=BookingConfirmation)
def create(payload: BookingPayload):
    return create_booking(payload)


@router.get("/{trip_id}", response_model=BookingConfirmation)
def by_id(trip_id: str):
    booking = get_booking(trip_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return booking
