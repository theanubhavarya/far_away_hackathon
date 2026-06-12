from pydantic import BaseModel

class BookingPayload(BaseModel):
    route_id: str
    traveler_name: str
    traveler_age: int
    id_type: str
    id_number: str
    phone: str
    payment_method: str

class BookingConfirmation(BaseModel):
    booking_id: str
    booking_ref: str
    route_id: str
    traveler_name: str
    total_paid_inr: int
    status: str
    segments_confirmed: list
    created_at: str
