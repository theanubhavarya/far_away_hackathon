// Yatri AI — Core TypeScript Types

export type TravelMode =
  | 'FASTEST'
  | 'ECONOMIC'
  | 'MAX_COMFORT'
  | 'BALANCED'
  | 'ECO';

export type TransportMode =
  | 'train'
  | 'bus'
  | 'flight'
  | 'cab'
  | 'metro'
  | 'auto'
  | 'walk'
  | 'bike';


export interface TravelerConfig {
  adults: number;
  children: number;
  seniors: number;
  pwd: number;
  bags: number;
}

export interface TripRequest {
  origin: string;
  destination: string;
  travel_date: string;
  return_date?: string;
  travelers: TravelerConfig;
  mode: TravelMode;
  accessibility: boolean;
  detour_city?: string;
  city?: string;
  pickup_area?: string;
  drop_area?: string;
}

export interface AccessibilityInfo {
  has_elevator: boolean;
  has_escalator: boolean;
  ac_waiting_room: boolean;
  wheelchair_ramps: boolean;
  medical_nearby?: string;
  step_free_route: boolean;
  walking_distance_meters: number;
}

export interface Stop {
  city: string;
  station_name: string;
  station_code: string;
  latitude: number;
  longitude: number;
  terminal_info?: string;
  accessibility?: AccessibilityInfo;
}

export interface RouteSegment {
  segment_id: string;
  origin_stop: Stop;
  destination_stop: Stop;
  mode: TransportMode;
  operator: string;
  class_type: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  fare_inr: number;
  platform_info: string;
  accessibility_info?: AccessibilityInfo;
  carbon_grams: number;
  provider?: string;
  bookingUrl?: string;
}

export interface CostBreakdown {
  transport_total_inr: number;
  estimated_local_cab_inr: number;
  estimated_food_inr: number;
  optional_fees_inr: number;
  total_min_inr: number;
  total_max_inr: number;
  segment_breakdown: Record<string, number>;
}

export interface LegOption {
  segments: RouteSegment[];
  total_time_minutes: number;
  total_cost_inr: number;
  cost_breakdown: CostBreakdown;
  departure_time: string;
  arrival_time: string;
  fare_per_person?: number;
  total_fare?: number;
}

export interface RouteOption {
  route_id: string;
  trip_type?: 'one_way' | 'round_trip';
  ml_rank?: number;
  sustainability_score?: number;
  outbound?: LegOption;
  return_leg?: LegOption;
  segments: RouteSegment[];
  total_time_minutes: number;
  total_cost_inr: number;
  cost_breakdown: CostBreakdown;
  comfort_score: number;
  reliability_score: number;
  carbon_grams: number;
  tags: string[];
  departure_time: string;
  arrival_time: string;
  fare_per_person?: number;
  total_fare?: number;
  travellers?: number;
}

export interface PlanRouteResponse {
  request_id: string;
  origin: string;
  destination: string;
  travel_date: string;
  routes: RouteOption[];
  planning_time_ms: number;
  agents_used: string[];
}

export interface DownstreamEffect {
  type: string;
  description: string;
  cost_delta: number;
}

export interface DisruptionEvent {
  disruption_id: string;
  affected_train: string;
  delay_minutes: number;
  reason: string;
  affected_route_id: string;
  cascade_effects: DownstreamEffect[];
  alternative_routes: RouteOption[];
  triggered_at: string;
}

export interface BookingConfirmation {
  booking_id: string;
  booking_ref: string;
  route_id: string;
  traveler_name: string;
  total_paid_inr: number;
  status: string;
  segments_confirmed: Array<Record<string, string>>;
  created_at: string;
}

export interface CitySearchResult {
  name: string;
  station: string;
  code: string;
  airport: string;
  lat: number;
  lon: number;
  display: string;
}


export interface GroupTrip {
  group_id: string;
  group_name: string;
  join_code: string;
  participants: Participant[];
  preferences: Record<string, ParticipantPreference>;
  votes: Record<VoteCategory, Record<string, number>>;
  participant_votes: Record<string, Partial<Record<VoteCategory, string>>>;
  requirements?: GroupTravelRequirements;
  recommendation?: GroupRecommendation;
  status: string;
  created_at: string;
  updated_at: string;
}

export type GroupPreferenceMode = 'Flight' | 'Train' | 'Bus' | 'Cab';
export type GroupPriority = 'Cheapest' | 'Fastest' | 'Balanced';
export type VoteCategory = 'destination' | 'travel_mode' | 'budget_range' | 'travel_dates';

export interface Participant {
  participant_id: string;
  name: string;
  is_admin: boolean;
  joined_at: string;
}

export interface ParticipantPreference {
  participant_id: string;
  origin_city: string;
  destination_city: string;
  travel_date: string;
  return_date?: string;
  budget: number;
  preferred_modes: GroupPreferenceMode[];
  priority: GroupPriority;
  additional_preferences: string[];
  submitted_at: string;
}

export interface GroupTravelRequirements {
  origin: string;
  destination: string;
  budget: number;
  preferred_mode: string;
  travel_date: string;
  return_date?: string;
  priority: GroupPriority;
}

export interface GroupRecommendation {
  group_id: string;
  requirements: GroupTravelRequirements;
  plan: PlanRouteResponse;
  generated_at: string;
}

export interface GroupResultsResponse {
  group: GroupTrip;
  requirements: GroupTravelRequirements;
  recommendation: GroupRecommendation;
}



export interface TravelModeOption {
  id: TravelMode;
  icon: string;
  label: string;
  description: string;
  extraField?: string;
}

export const TRAVEL_MODE_OPTIONS: TravelModeOption[] = [
  { id: 'FASTEST', icon: '⚡', label: 'Minimum Time', description: 'Fastest route, cost secondary' },
  { id: 'ECONOMIC', icon: '₹', label: 'Economic', description: 'Average comfort & decent prices' },
  { id: 'MAX_COMFORT', icon: '👑', label: 'Maximum Comfort', description: 'First class / AC throughout. No compromises.' },
  { id: 'BALANCED', icon: '⚖️', label: 'Balanced', description: 'Perfect mix of comfort, speed, and budget' },
  { id: 'ECO', icon: '🌿', label: 'Eco Mode', description: 'Lowest carbon footprint route' },
];

export const TRANSPORT_COLORS: Record<TransportMode, string> = {
  train: '#3B9EFF',
  bus: '#10B981',
  flight: '#8B5CF6',
  cab: '#F59E0B',
  metro: '#EC4899',
  auto: '#F97316',
  walk: '#94A3B8',
  bike: '#84CC16',
};

export const TRANSPORT_ICONS: Record<TransportMode, string> = {
  train: '🚂',
  bus: '🚌',
  flight: '✈️',
  cab: '🚕',
  metro: '🚇',
  auto: '🛺',
  walk: '🚶',
  bike: '🚲',
};

export const TAG_LABELS: Record<string, { label: string; color: string }> = {
  BEST_VALUE: { label: 'Best Value', color: 'var(--color-success)' },
  FASTEST: { label: 'Fastest', color: 'var(--color-primary)' },
  RECOMMENDED: { label: 'Recommended', color: 'var(--color-ai)' },
  LOWEST_CARBON: { label: 'Lowest Carbon', color: '#84CC16' },
  MOST_COMFORTABLE: { label: 'Most Comfortable', color: 'var(--color-flight)' },
};

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatCurrency(amount: number): string {
  const hasDecimal = amount % 1 !== 0;
  if (amount >= 100) {
    const formatted = hasDecimal
      ? amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : amount.toLocaleString('en-IN');
    return `₹${formatted}`;
  }
  const formatted = hasDecimal ? amount.toFixed(2) : amount.toString();
  return `₹${formatted}`;
}

export function formatCarbon(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg CO₂`;
  return `${grams} g CO₂`;
}

export function getCarbonColor(grams: number): string {
  const kg = grams / 1000;
  if (kg < 30) return 'var(--color-success)';
  if (kg < 80) return 'var(--color-warning)';
  return 'var(--color-disruption)';
}
