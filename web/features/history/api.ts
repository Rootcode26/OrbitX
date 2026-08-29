import { requestJson } from "@/lib/api/client";

export interface SatelliteHistorySummary {
  norad_cat_id: number;
  name: string;
  object_type: string;
  owner: string | null;
  operational_status: string | null;
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
  satellite: SatelliteHistorySummary;
  records: SatelliteHistoryRecord[];
  page: { limit: number; has_more: boolean; next_cursor: string | null };
}

export interface SatelliteHistoryQuery {
  limit?: number;
  before?: string;
}

interface SatelliteHistoryResponse {
  data: SatelliteHistoryPage;
}

export async function fetchSatelliteHistory(
  noradCatId: number,
  query: SatelliteHistoryQuery = {},
): Promise<SatelliteHistoryPage> {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.before) params.set("before", query.before);

  const search = params.toString();
  const response = await requestJson<SatelliteHistoryResponse>(
    `/satellites/info/${noradCatId}/history${search ? `?${search}` : ""}`,
  );
  return response.data;
}
