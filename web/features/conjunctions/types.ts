export type ConjunctionRiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ConjunctionRiskFilter = "ALL" | ConjunctionRiskLevel;

export interface ConjunctionObject {
  noradCatId: number;
  name: string;
  objectType: "PAYLOAD" | "ROCKET BODY" | "DEBRIS" | "UNKNOWN";
  status: "ACTIVE" | "INACTIVE" | "UNKNOWN";
  owner: string | null;
  launchDate: string | null;
  altitudeKm: number | null;
  apogeeKm: number | null;
  perigeeKm: number | null;
  inclinationDegrees: number | null;
  raanDegrees: number | null;
}

export interface ConjunctionEvent {
  id: string;
  objectA: ConjunctionObject;
  objectB: ConjunctionObject;
  risk: ConjunctionRiskLevel;
  tcaIso: string | null;
  tcaLabel: string;
  computedAt: string;
  minimumSeparationKm: number | null;
  relativeVelocityKmS: number | null;
  encounterAngleDegrees: number | null;
  riskScore: number;
  screeningWindowHours: number;
  profileSpanKm: number;
  radialUncertaintyM: number | null;
  separationProfile: SeparationSample[];
  tcaState: EncounterState | null;
  encounterTrack: EncounterTrackSample[] | null;
}

export interface SeparationSample {
  timestamp: string;
  separationKm: number;
  closingRateKmS: number | null;
}

export interface Vec3Data {
  x: number;
  y: number;
  z: number;
}

export interface EncounterStateObject {
  positionKm: Vec3Data;
  velocityKmS: Vec3Data;
}

export interface EncounterState {
  a: EncounterStateObject;
  b: EncounterStateObject;
}

export interface EncounterTrackSample {
  offsetSeconds: number;
  positionAKm: Vec3Data;
  positionBKm: Vec3Data;
  separationKm: number;
}

export interface ScreenedEventListProps {
  events: ConjunctionEvent[];
  selectedEventId: string;
  filter: ConjunctionRiskFilter;
  counts: Record<ConjunctionRiskFilter, number>;
  currentPage: number;
  totalPages: number;
  onFilterChange: (filter: ConjunctionRiskFilter) => void;
  onPageChange: (page: number) => void;
  onSelect: (eventId: string) => void;
}

export interface ConjunctionCheckRequest {
  satellite_a_norad_id: number;
  satellite_b_norad_id: number;
  start_time?: string;
  duration_minutes?: number;
  step_seconds?: number;
  include_separation_profile?: boolean;
}

export type ConjunctionCheckResult = Record<string, unknown>;

export interface ConjunctionCheckApiResponse {
  data: ConjunctionCheckResult;
}

export type ConjunctionEventRiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "CLEAR";

export interface ConjunctionEndpointObject {
  norad_cat_id: number;
  name: string;
}

export interface ConjunctionEventRecord {
  id: string;
  object_a: ConjunctionEndpointObject;
  object_b: ConjunctionEndpointObject;
  screening_started_at: string;
  screening_duration_minutes: number;
  screening_step_seconds: number;
  computed_at: string;
  tca: string | null;
  minimum_separation_km: number | null;
  relative_velocity_km_s: number | null;
  collision_probability: number | null;
  risk_score: number | null;
  risk_level: ConjunctionEventRiskLevel;
  encounter_angle_degrees: number | null;
  radial_uncertainty_m: number | null;
  separation_profile: unknown[] | null;
  raw_result: Record<string, unknown>;
}

export interface ConjunctionEventPage {
  events: ConjunctionEventRecord[];
  page: { limit: number; has_more: boolean; next_cursor: string | null };
}

export interface ConjunctionEventListQuery {
  riskLevel?: ConjunctionEventRiskLevel;
  from?: string;
  to?: string;
  before?: string;
  upcoming?: boolean;
  limit?: number;
}

export interface ConjunctionEventPageResponse {
  data: ConjunctionEventPage;
}

export interface ConjunctionEventResponse {
  data: ConjunctionEventRecord;
}

export interface ConjunctionDailyMetric {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  clear: number;
  total: number;
}

export interface ConjunctionDistributionMetric {
  label: string;
  count: number;
}

export interface ConjunctionRiskMetric {
  risk_level: ConjunctionEventRiskLevel;
  count: number;
  percentage: number;
}

export interface ConjunctionAnalytics {
  window_days: number;
  total_events: number;
  events_over_time: ConjunctionDailyMetric[];
  miss_distance_distribution: ConjunctionDistributionMetric[];
  risk_distribution: ConjunctionRiskMetric[];
  upcoming_events: ConjunctionEventRecord[];
}

export interface ConjunctionAnalyticsResponse {
  data: ConjunctionAnalytics;
}

export interface ConjunctionScreenRequest {
  primary_norad_id: number;
  candidate_limit?: number;
  start_time?: string;
  duration_minutes?: number;
  step_seconds?: number;
  include_separation_profile?: boolean;
}

export interface ConjunctionScreenComparisonRisk {
  risk_level: ConjunctionEventRiskLevel;
  risk_score: number | null;
  minimum_separation_km: number | null;
  relative_velocity_km_s: number | null;
  tca: string | null;
}

export interface ConjunctionScreenComparison {
  satellite: ConjunctionEndpointObject;
  result: Record<string, unknown>;
  risk: ConjunctionScreenComparisonRisk;
}

export interface ConjunctionScreenResult {
  primary_satellite: ConjunctionEndpointObject;
  requested: number;
  completed: number;
  failed: number;
  comparisons: ConjunctionScreenComparison[];
  errors: { satellite: ConjunctionEndpointObject; message: string }[];
}

export interface ConjunctionScreenResponse {
  data: ConjunctionScreenResult;
}
