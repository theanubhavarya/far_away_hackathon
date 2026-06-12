from datetime import datetime, timezone

from app.schemas import BookingConfirmation, BookingPayload
from app.services.route_service import get_route
from app.utils.helpers import new_id


BOOKINGS: dict[str, BookingConfirmation] = {}


def create_booking(payload: BookingPayload) -> BookingConfirmation:
    route = get_route(payload.route_id)
    total = route.total_cost_inr if route else 0
    confirmed = []
    if route:
        confirmed = [
            {
                "segment_id": segment.segment_id,
                "operator": segment.operator,
                "pnr": new_id("PNR").upper(),
                "status": "CONFIRMED",
            }
            for segment in route.segments
        ]
    booking = BookingConfirmation(
        booking_id=new_id("booking"),
        booking_ref=f"YATRI-{new_id('ref').split('_')[1].upper()[:8]}",
        route_id=payload.route_id,
        traveler_name=payload.traveler_name,
        total_paid_inr=total,
        status="CONFIRMED",
        segments_confirmed=confirmed,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    BOOKINGS[booking.booking_id] = booking
    return booking


def get_booking(trip_id: str) -> BookingConfirmation | None:
    return BOOKINGS.get(trip_id)
