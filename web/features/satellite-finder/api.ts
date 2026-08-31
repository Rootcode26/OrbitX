import { requestJson } from "@/lib/api/client";
import type { CurrentSatelliteStateApiRecord } from "@/features/live-tracking/types";

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
  primary_satellite: SatelliteFinderObject;
  requested: number;
  completed: number;
  failed: number;
  comparisons: { satellite: SatelliteFinderObject; result: Record<string, unknown> }[];
  errors: { satellite: SatelliteFinderObject; message: string }[];
}

interface SatelliteFinderComparisonResponse {
  data: SatelliteFinderComparisonResult;
}

export interface NearbySatelliteRecord extends CurrentSatelliteStateApiRecord {
  separation_km: number;
  relative_velocity_km_s: number;
}

export interface NearbySatelliteResult {
  primary_satellite: CurrentSatelliteStateApiRecord;
  radius_km: number;
  satellites: NearbySatelliteRecord[];
  page: {
    number: number;
    size: number;
    total_items: number;
    total_pages: number;
  };
}

interface NearbySatelliteResponse {
  data: NearbySatelliteResult;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function compareSatelliteFinder(
  token: string,
  request: SatelliteFinderComparisonRequest,
): Promise<SatelliteFinderComparisonResult> {
  const response = await requestJson<SatelliteFinderComparisonResponse>("/satellites/info/finder/compare", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(request),
  });
  return response.data;
}

export async function fetchNearbySatellites(
  primaryNoradId: number,
  page: number,
  pageSize: number,
): Promise<NearbySatelliteResult> {
  const response = await requestJson<NearbySatelliteResponse>(
    `/satellites/info/finder/${primaryNoradId}/nearby?page=${page}&page_size=${pageSize}`,
  );
  return response.data;
}
