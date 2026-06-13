// Yatri AI — API Client
import axios from 'axios';
import type {
  TripRequest,
  PlanRouteResponse,
  RouteOption,
  DisruptionEvent,
  BookingConfirmation,
  CitySearchResult,
  GroupTrip,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── Cities ───────────────────────────────────────────────────────
export async function searchCities(q: string): Promise<CitySearchResult[]> {
  const { data } = await api.get<CitySearchResult[]>('/api/v1/cities/search', { params: { q } });
  return data;
}

export async function getIntracityLocations(city: string): Promise<{ city: string; locations: string[] }> {
  const { data } = await api.get<{ city: string; locations: string[] }>('/api/v1/intracity/locations', { params: { city } });
  return data;
}

// ── Route Planning ───────────────────────────────────────────────
export async function planRoutes(request: TripRequest): Promise<PlanRouteResponse> {
  const { data } = await api.post<PlanRouteResponse>('/api/v1/routes/plan', request);
  return data;
}

export async function getRoute(routeId: string): Promise<RouteOption> {
  const { data } = await api.get<RouteOption>(`/api/v1/routes/${routeId}`);
  return data;
}

export async function replanRoute(routeId: string, scenarioId = 'train_delay_2h'): Promise<DisruptionEvent> {
  const { data } = await api.post<DisruptionEvent>(`/api/v1/routes/${routeId}/replan`, null, {
    params: { scenario_id: scenarioId },
  });
  return data;
}

// ── Bookings ─────────────────────────────────────────────────────
export interface BookingPayload {
  route_id: string;
  traveler_name: string;
  traveler_age: number;
  id_type: string;
  id_number: string;
  phone: string;
  payment_method: string;
}

export async function createBooking(payload: BookingPayload): Promise<BookingConfirmation> {
  const { data } = await api.post<BookingConfirmation>('/api/v1/trips', payload);
  return data;
}

export async function getTrip(tripId: string): Promise<BookingConfirmation> {
  const { data } = await api.get<BookingConfirmation>(`/api/v1/trips/${tripId}`);
  return data;
}

// ── Groups ───────────────────────────────────────────────────────
export interface GroupPayload {
  group_name: string;
  members: string[];
  destination_options?: string[];
  budget_per_person: number;
}

export async function createGroup(payload: GroupPayload): Promise<GroupTrip> {
  const { data } = await api.post<GroupTrip>('/api/v1/groups', payload);
  return data;
}

export async function voteDestination(groupId: string, destination: string, member: string): Promise<{ votes: Record<string, number> }> {
  const { data } = await api.post(`/api/v1/groups/${groupId}/vote`, null, {
    params: { destination, member },
  });
  return data;
}

// ── Demo ─────────────────────────────────────────────────────────
export async function triggerDisruption(routeId?: string): Promise<DisruptionEvent> {
  const { data } = await api.post<DisruptionEvent>('/api/v1/demo/trigger-disruption', null, {
    params: routeId ? { route_id: routeId } : {},
  });
  return data;
}

export async function preloadDemo(): Promise<PlanRouteResponse> {
  const { data } = await api.get<PlanRouteResponse>('/api/v1/demo/preload');
  return data;
}

export default api;
