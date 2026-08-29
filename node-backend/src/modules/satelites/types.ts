export interface TleData {
  tle_line1: string;
  tle_line2: string;
  observation_time: string;
}

export interface TleComparisonData {
  satellite_a: {
         norad_cat_id: string;
         name: string;
         tle_line1: string;
         tle_line2: string;
     };
     satellite_b: {
         norad_cat_id: string;
         name: string;
         tle_line1: string;
         tle_line2: string;
     };
     start_time: string;
     duration_minutes: number;
     step_seconds: number;
     include_seperation_profile: boolean;
}

export interface ConjunctionCheckRequest {
  satellite_a_norad_id: number;
  satellite_b_norad_id: number;
  start_time?: string;
  duration_minutes?: number;
  step_seconds?: number;
  include_separation_profile?: boolean;
}

export interface SatelliteFinderComparisonRequest {
  primary_norad_id: number;
  comparison_norad_ids: number[];
  start_time?: string;
  duration_minutes?: number;
  step_seconds?: number;
  include_separation_profile?: boolean;
}

export interface SatelliteFinderObject {
  norad_cat_id: number;
  name: string;
}

export interface SatelliteFinderComparisonResult {
  satellite: SatelliteFinderObject;
  result: ConjunctionCheckResponse;
}

export interface SatelliteFinderComparisonError {
  satellite: SatelliteFinderObject;
  message: string;
}

export interface SatelliteFinderComparisonResponse {
  primary_satellite: SatelliteFinderObject;
  requested: number;
  completed: number;
  failed: number;
  comparisons: SatelliteFinderComparisonResult[];
  errors: SatelliteFinderComparisonError[];
}

export interface SatelliteConjunctionScreenRequest {
  primary_norad_id: number;
  candidate_limit: number;
  start_time?: string;
  duration_minutes?: number;
  step_seconds?: number;
  include_separation_profile?: boolean;
}

export interface SatelliteTrajectoryRequest {
  norad_cat_id: number;
  start_time: string;
  duration_minutes: number;
  step_seconds: number;
}

export interface SatelliteTrajectoryPoint extends Sgp4PropagationResult {
  timestamp_utc: string;
}

export interface SatelliteTrajectoryError extends SatelliteApiError {
  timestamp_utc: string;
}

export interface SatelliteTrajectoryResponse {
  satellite: SatelliteFinderObject;
  reference_frame: string;
  start_time_utc: string;
  end_time_utc: string;
  step_seconds: number;
  points: SatelliteTrajectoryPoint[];
  errors: SatelliteTrajectoryError[];
}

export interface GroundStationInput {
  id: string;
  name: string;
  latitude_degrees: number;
  longitude_degrees: number;
  altitude_meters: number;
}

export interface GroundStationPassRequest extends SatelliteTrajectoryRequest {
  minimum_elevation_degrees: number;
  stations: GroundStationInput[];
}

export interface GroundStationPass {
  station: GroundStationInput;
  rise_time_utc: string;
  peak_time_utc: string;
  set_time_utc: string;
  maximum_elevation_degrees: number;
}

export interface GroundStationPassResponse {
  satellite: SatelliteFinderObject;
  start_time_utc: string;
  end_time_utc: string;
  minimum_elevation_degrees: number;
  passes: GroundStationPass[];
  propagation_errors: SatelliteTrajectoryError[];
}

export interface LatestSatelliteTle {
  norad_cat_id: number;
  satellite_name: string;
  tle_line1: string;
  tle_line2: string;
}

export type ConjunctionCheckResponse = Record<string, unknown>;

export interface MultipleTleComparisonData {
  satellites: {
      norad_id: string;
      name: string;
      tle_line1: string;
      tle_line2: string;
  }[];
  start_time: string;
  duration_minutes: number;
  step_seconds: number
}

export interface Sgp4PropagationRequest {
      satellites: {
          norad_cat_id: number;
          tle_line1: string;
          tle_line2: string;
      }[];
      prediction_time: string;
}

export interface SatelliteCurrentDataRequest{
  satellites: {
      norad_cat_id: number;
      tle_line1: string;
      tle_line2: string;
  }[];
  observation_time: string;
}

export interface SatelliteApiError {
  norad_cat_id: number;
  code: string;
  message: string;
}

export interface Sgp4PropagationResult {
  norad_cat_id: number;
  position_km: {
    x: number;
    y: number;
    z: number;
  };
  velocity_km_s: {
    x: number;
    y: number;
    z: number;
  };
}

export interface Sgp4PropagationResponse {
  prediction_time_utc: string;
  reference_frame: string;
  results: Sgp4PropagationResult[];
  errors: SatelliteApiError[];
}

export interface SatelliteCurrentDataResult {
  norad_cat_id: number;
  tle_epoch: string;
  current_speed_km_s: number;
  current_height_km: number;
  latitude_degrees: number;
  longitude_degrees: number;
  apogee_height_km: number;
  perigee_height_km: number;
  orbital_period_minutes: number;
  inclination_degrees: number;
  raan_degrees: number;
  revolution_number: number;
}

export interface SatelliteCurrentDataResponse {
  observation_time_utc: string;
  results: SatelliteCurrentDataResult[];
  errors: SatelliteApiError[];
}

export interface PropagationDatabaseUpdate {
  norad_cat_id: number;
  tle_epoch: string;
  tle_line1: string;
  tle_line2: string;
  reference_frame: string;
  position_x_km: number;
  position_y_km: number;
  position_z_km: number;
  velocity_x_km_s: number;
  velocity_y_km_s: number;
  velocity_z_km_s: number;
  calculated_at: string;
}

export interface CurrentStateDatabaseUpdate {
  norad_cat_id: number;
  tle_epoch: string;
  tle_line1: string;
  tle_line2: string;
  inclination_degrees: number;
  orbital_period_minutes: number;
  apogee_km: number;
  perigee_km: number;
  height_km: number;
  speed_km_s: number;
  latitude_degrees: number;
  longitude_degrees: number;
  raan_degrees: number;
  revolution_number: number;
  calculated_at: string;
}

export interface StorePropagationResultsSummary {
  requested: number;
  stored: number;
  skippedNoradIds: number[];
}

export interface StoredNoradIdsRow {
  stored_norad_ids: number[];
}

export interface SatelliteStateDatabaseRow {
  norad_cat_id: number;
  satellite_name: string;
  object_type: string | null;
  owner: string | null;
  operational_status: string | null;
  calculated_at: Date;
  tle_epoch: Date;
  reference_frame: string;
  position_x_km: number;
  position_y_km: number;
  position_z_km: number;
  velocity_x_km_s: number;
  velocity_y_km_s: number;
  velocity_z_km_s: number;
  height_km: number;
  speed_km_s: number;
  latitude_degrees: number;
  longitude_degrees: number;
  inclination_degrees: number;
  raan_degrees: number;
  orbital_period_minutes: number;
  apogee_km: number;
  perigee_km: number;
  revolution_number: number;
}

export interface SatelliteStateVector {
  x: number;
  y: number;
  z: number;
}

export interface SatelliteCurrentState {
  norad_cat_id: number;
  name: string;
  object_type: string | null;
  owner: string | null;
  operational_status: string | null;
  calculated_at: string;
  tle_epoch: string;
  reference_frame: string;
  position_km: SatelliteStateVector;
  velocity_km_s: SatelliteStateVector;
  height_km: number;
  speed_km_s: number;
  latitude_degrees: number;
  longitude_degrees: number;
  inclination_degrees: number;
  raan_degrees: number;
  orbital_period_minutes: number;
  apogee_km: number;
  perigee_km: number;
  revolution_number: number;
}

export interface SatelliteStateCollection {
  states: SatelliteCurrentState[];
  count: number;
  limit: number;
}

export interface SatelliteSummaryDatabaseRow {
  norad_cat_id: number;
  satellite_name: string;
  object_type: string | null;
  owner: string | null;
  operational_status: string | null;
}

export interface SatelliteSummary {
  norad_cat_id: number;
  name: string;
  object_type: string | null;
  owner: string | null;
  operational_status: string | null;
}

export interface SatelliteHistoryDatabaseRow {
  calculated_at: Date;
  tle_epoch: Date;
  tle_line1: string;
  height_km: number;
  altitude_delta_km: number | null;
  apogee_km: number;
  perigee_km: number;
  inclination_degrees: number;
  raan_degrees: number;
  orbital_period_minutes: number;
  revolution_number: number;
}

export interface SatelliteHistoryRecord {
  calculated_at: string;
  tle_epoch: string;
  height_km: number;
  altitude_delta_km: number | null;
  apogee_km: number;
  perigee_km: number;
  inclination_degrees: number;
  raan_degrees: number;
  orbital_period_minutes: number;
  mean_motion_revolutions_per_day: number;
  bstar: number | null;
  revolution_number: number;
}

export interface SatelliteHistoryPage {
  satellite: SatelliteSummary;
  records: SatelliteHistoryRecord[];
  page: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
}

export type SatelliteCatalogSort =
  | "name"
  | "altitude"
  | "inclination"
  | "speed";

export type SortDirection = "asc" | "desc";

export interface SatelliteCatalogQuery {
  page: number;
  page_size: number;
  search?: string;
  object_type?: "PAY" | "R/B" | "DEB" | "UNK";
  status?: "active" | "inactive";
  owner?: string;
  minimum_altitude_km?: number;
  maximum_altitude_km?: number;
  sort: SatelliteCatalogSort;
  direction: SortDirection;
}

export interface SatelliteCatalogDatabaseRow {
  norad_cat_id: number;
  satellite_name: string;
  object_type: string | null;
  owner: string | null;
  operational_status: string | null;
  international_designator: string | null;
  launch_date: string | null;
  launch_site: string | null;
  decay_date: string | null;
  radar_cross_section: number | null;
  data_status_code: string | null;
  orbit_center: string | null;
  orbit_type: string | null;
  tle_epoch: Date | null;
  calculated_at: Date | null;
  height_km: number | null;
  speed_km_s: number | null;
  latitude_degrees: number | null;
  longitude_degrees: number | null;
  inclination_degrees: number | null;
  raan_degrees: number | null;
  orbital_period_minutes: number | null;
  apogee_km: number | null;
  perigee_km: number | null;
  revolution_number: number | null;
  reference_frame: string | null;
  position_x_km: number | null;
  position_y_km: number | null;
  position_z_km: number | null;
  velocity_x_km_s: number | null;
  velocity_y_km_s: number | null;
  velocity_z_km_s: number | null;
}

export interface SatelliteCatalogRecord {
  norad_cat_id: number;
  name: string;
  object_type: string | null;
  owner: string | null;
  operational_status: string | null;
  international_designator: string | null;
  launch_date: string | null;
  launch_site: string | null;
  decay_date: string | null;
  radar_cross_section: number | null;
  data_status_code: string | null;
  orbit_center: string | null;
  orbit_type: string | null;
  tle_epoch: string | null;
  calculated_at: string | null;
  height_km: number | null;
  speed_km_s: number | null;
  latitude_degrees: number | null;
  longitude_degrees: number | null;
  inclination_degrees: number | null;
  raan_degrees: number | null;
  orbital_period_minutes: number | null;
  apogee_km: number | null;
  perigee_km: number | null;
  revolution_number: number | null;
  reference_frame: string | null;
  position_km: SatelliteStateVector | null;
  velocity_km_s: SatelliteStateVector | null;
}

export interface SatelliteCatalogPage {
  satellites: SatelliteCatalogRecord[];
  page: {
    number: number;
    size: number;
    total_items: number;
    total_pages: number;
  };
}

export interface SatelliteCatalogOptions {
  owners: string[];
  object_types: Array<"PAY" | "R/B" | "DEB" | "UNK">;
  altitude_range_km: {
    minimum: number | null;
    maximum: number | null;
  };
}

export interface OverviewDatabaseRow {
  tracked_objects: string;
  active_payloads: string;
  inactive_payloads: string;
  debris: string;
  rocket_bodies: string;
  propagated_objects: string;
  latest_catalog_update: Date | null;
  latest_tle_epoch: Date | null;
  latest_propagation: Date | null;
  upcoming_conjunctions: string;
  high_risk_conjunctions: string;
  unacknowledged_alerts: string;
}

export interface OverviewSummary {
  tracked_objects: number;
  active_payloads: number;
  inactive_payloads: number;
  debris: number;
  rocket_bodies: number;
  propagated_objects: number;
  latest_catalog_update: string | null;
  latest_tle_epoch: string | null;
  latest_propagation: string | null;
  upcoming_conjunctions: number;
  high_risk_conjunctions: number;
  unacknowledged_alerts: number;
}

export interface ObjectClassificationMetric {
  category: "active_payloads" | "inactive_payloads" | "rocket_bodies" | "debris" | "unknown";
  count: number;
}

export interface AltitudeDensityMetric {
  minimum_km: number;
  maximum_km: number;
  count: number;
}

export interface NamedCountMetric {
  name: string;
  count: number;
}

export interface SatelliteAnalytics {
  total_objects: number;
  objects_with_orbit_data: number;
  classifications: ObjectClassificationMetric[];
  altitude_density: AltitudeDensityMetric[];
  top_owners: NamedCountMetric[];
  operational_statuses: NamedCountMetric[];
  conjunctions: ConjunctionAnalytics;
}

export interface ClassificationDatabaseRow {
  active_payloads: number;
  inactive_payloads: number;
  rocket_bodies: number;
  debris: number;
  unknown: number;
}

export interface AnalyticsTotalsDatabaseRow {
  total_objects: number;
  objects_with_orbit_data: number;
}

export interface DataSourceDatabaseRow {
  satcat_records: string;
  tle_records: string;
  propagation_records: string;
  current_state_records: string;
  conjunction_records: string;
  latest_catalog_update: Date | null;
  latest_tle_update: Date | null;
  latest_propagation: Date | null;
  latest_current_state: Date | null;
  latest_conjunction: Date | null;
}

export interface DataSourceStatus {
  id: "satcat" | "tle" | "propagation" | "current_state" | "conjunction";
  name: string;
  status: "available" | "empty" | "updated" | "cached" | "failed";
  records: number;
  last_sync_utc: string | null;
  cadence: string;
  endpoint: string;
  error?: string;
}

export interface SatelliteMakerRequest {
  object_name: string;
  operator: string;
  country: string;
  object_type: "PAYLOAD" | "ROCKET_BODY" | "DEBRIS";
  epoch_utc: string;
  altitude_km: number;
  inclination_degrees: number;
  raan_degrees: number;
  argument_of_perigee_degrees: number;
  phase_degrees: number;
  apsis_offset_km: number;
  bstar: number;
  temporary_norad_id: number;
  comparison_norad_ids: number[];
}

export interface GeneratedTle {
  line1: string;
  line2: string;
}

export interface SatelliteMakerDerivedOrbit {
  semi_major_axis_km: number;
  apogee_km: number;
  perigee_km: number;
  eccentricity: number;
  orbital_period_minutes: number;
  revolutions_per_day: number;
}

export interface SatelliteMakerConjunctionResult {
  norad_cat_id: number;
  name: string;
  result: ConjunctionCheckResponse;
}

export interface SatelliteMakerPreview {
  satellite: {
    norad_cat_id: number;
    name: string;
    operator: string;
    country: string;
    object_type: SatelliteMakerRequest["object_type"];
  };
  tle: GeneratedTle;
  orbit: SatelliteMakerDerivedOrbit;
  state: {
    propagation: Sgp4PropagationResult;
    current: SatelliteCurrentDataResult;
    reference_frame: string;
    calculated_at: string;
  };
  conjunctions: SatelliteMakerConjunctionResult[];
}

export interface CommissionedSatellite {
  norad_cat_id: number;
  name: string;
  object_type: SatelliteMakerRequest["object_type"];
  operator: string;
  country: string;
  calculated_at: string;
  tle_epoch: string;
}

export interface SavedMakerSatelliteDatabaseRow {
  norad_cat_id: number;
  satellite_name: string;
  object_type: "PAY" | "R/B" | "DEB";
  owner: string | null;
  epoch: Date;
  tle_line2: string;
  height_km: number | null;
  inclination_degrees: number | null;
  raan_degrees: number | null;
  speed_km_s: number | null;
  orbital_period_minutes: number | null;
  apogee_km: number | null;
  perigee_km: number | null;
}

export interface SavedMakerSatellite {
  norad_cat_id: number;
  name: string;
  object_type: SatelliteMakerRequest["object_type"];
  operator: string;
  epoch_utc: string;
  altitude_km: number | null;
  inclination_degrees: number | null;
  raan_degrees: number;
  argument_of_perigee_degrees: number;
  phase_degrees: number;
  eccentricity: number;
  velocity_km_s: number | null;
  orbital_period_minutes: number | null;
}

export type ConjunctionRiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "CLEAR";

export interface ConjunctionEventWrite {
  object_a_norad_id: number;
  object_b_norad_id: number;
  screening_started_at: string;
  screening_duration_minutes: number;
  screening_step_seconds: number;
  computed_at: string;
  tca: string | null;
  minimum_separation_km: number | null;
  relative_velocity_km_s: number | null;
  collision_probability: number | null;
  risk_score: number | null;
  risk_level: ConjunctionRiskLevel;
  encounter_angle_degrees: number | null;
  radial_uncertainty_m: number | null;
  separation_profile: unknown[] | null;
  raw_result: ConjunctionCheckResponse;
}

export interface ConjunctionEventDatabaseRow {
  id: string;
  object_a_norad_id: number;
  object_a_name: string;
  object_b_norad_id: number;
  object_b_name: string;
  screening_started_at: Date;
  screening_duration_minutes: number;
  screening_step_seconds: number;
  computed_at: Date;
  tca: Date | null;
  minimum_separation_km: number | null;
  relative_velocity_km_s: number | null;
  collision_probability: number | null;
  risk_score: number | null;
  risk_level: ConjunctionRiskLevel;
  encounter_angle_degrees: number | null;
  radial_uncertainty_m: number | null;
  separation_profile: unknown[] | null;
  raw_result: ConjunctionCheckResponse;
  created_at: Date;
}

export interface ConjunctionEventRecord {
  id: string;
  object_a: SatelliteFinderObject;
  object_b: SatelliteFinderObject;
  screening_started_at: string;
  screening_duration_minutes: number;
  screening_step_seconds: number;
  computed_at: string;
  tca: string | null;
  minimum_separation_km: number | null;
  relative_velocity_km_s: number | null;
  collision_probability: number | null;
  risk_score: number | null;
  risk_level: ConjunctionRiskLevel;
  encounter_angle_degrees: number | null;
  radial_uncertainty_m: number | null;
  separation_profile: unknown[] | null;
  raw_result: ConjunctionCheckResponse;
}

export interface ConjunctionEventListQuery {
  risk_level?: ConjunctionRiskLevel;
  from?: string;
  to?: string;
  before?: string;
  upcoming?: boolean;
  limit: number;
}

export interface ConjunctionEventPage {
  events: ConjunctionEventRecord[];
  page: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
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
  risk_level: ConjunctionRiskLevel;
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

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type AlertSource = "CONJUNCTION_SCREENING" | "ORBIT_DATA" | "PROPAGATION" | "CATALOG_SYNC" | "SYSTEM";

export interface AlertCreateRequest {
  severity: AlertSeverity;
  source: AlertSource;
  title: string;
  description: string;
  conjunction_event_id?: string;
}

export interface AlertDatabaseRow {
  id: string;
  conjunction_event_id: string | null;
  severity: AlertSeverity;
  source: AlertSource;
  title: string;
  description: string;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AlertRecord {
  id: string;
  conjunction_event_id: string | null;
  severity: AlertSeverity;
  source: AlertSource;
  title: string;
  description: string;
  acknowledged: boolean;
  resolved: boolean;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertListQuery {
  source: AlertSource;
  severity?: AlertSeverity;
  status: "all" | "unacknowledged" | "acknowledged" | "resolved";
  limit: number;
}

export interface AlertCollection {
  alerts: AlertRecord[];
  counts: {
    all: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolved: number;
    unacknowledged: number;
  };
}

export interface WishlistSatelliteDatabaseRow {
  norad_cat_id: number;
  satellite_name: string;
  object_type: string | null;
  owner: string | null;
  operational_status: string | null;
  created_at: Date;
}

export interface WishlistSatellite {
  norad_cat_id: number;
  name: string;
  object_type: string | null;
  owner: string | null;
  operational_status: string | null;
  added_at: string;
}
