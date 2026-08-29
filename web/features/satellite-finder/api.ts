import { requestJson } from "@/lib/api/client";

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

export async function compareSatelliteFinder(
  request: SatelliteFinderComparisonRequest,
): Promise<SatelliteFinderComparisonResult> {
  const response = await requestJson<SatelliteFinderComparisonResponse>("/satellites/info/finder/compare", {
    method: "POST",
    body: JSON.stringify(request),
  });
  return response.data;
}
