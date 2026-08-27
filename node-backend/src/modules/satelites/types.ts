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
