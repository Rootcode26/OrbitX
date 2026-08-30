import { requestJson } from "@/lib/api/client";

export interface SatelliteTrajectoryRequest {
  norad_cat_id: number;
  start_time?: string;
  duration_minutes?: number;
  step_seconds?: number;
}

export interface SatelliteTrajectoryPoint {
  norad_cat_id: number;
  timestamp_utc: string;
  position_km: { x: number; y: number; z: number };
  velocity_km_s?: { x: number; y: number; z: number };
  [key: string]: unknown;
}

export interface SatelliteTrajectoryError {
  norad_cat_id: number;
  timestamp_utc: string;
  code: string;
  message: string;
}

export interface SatelliteTrajectoryResult {
  satellite: { norad_cat_id: number; name: string };
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
  altitude_meters?: number;
}

export interface GroundStationPassRequest extends SatelliteTrajectoryRequest {
  minimum_elevation_degrees?: number;
  stations: GroundStationInput[];
}

export interface GroundStationPass {
  station: GroundStationInput;
  rise_time_utc: string;
  peak_time_utc: string;
  set_time_utc: string;
  maximum_elevation_degrees: number;
}

export interface GroundStationPassResult {
  satellite: { norad_cat_id: number; name: string };
  start_time_utc: string;
  end_time_utc: string;
  minimum_elevation_degrees: number;
  passes: GroundStationPass[];
  propagation_errors: SatelliteTrajectoryError[];
}

interface SatelliteTrajectoryResponse {
  data: SatelliteTrajectoryResult;
}

interface GroundStationPassResponse {
  data: GroundStationPassResult;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchSatelliteTrajectory(
  token: string,
  request: SatelliteTrajectoryRequest,
): Promise<SatelliteTrajectoryResult> {
  const response = await requestJson<SatelliteTrajectoryResponse>("/satellites/info/trajectory", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(request),
  });
  return response.data;
}

export async function fetchGroundStationPasses(
  request: GroundStationPassRequest,
): Promise<GroundStationPassResult> {
  const response = await requestJson<GroundStationPassResponse>("/satellites/info/ground-station-passes", {
    method: "POST",
    body: JSON.stringify(request),
  });
  return response.data;
}
