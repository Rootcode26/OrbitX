import { requestJson } from "@/lib/api/client";
import type { ConjunctionAnalytics } from "@/features/conjunctions/types";

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

interface SatelliteAnalyticsResponse {
  data: SatelliteAnalytics;
}

export async function fetchSatelliteAnalytics(): Promise<SatelliteAnalytics> {
  const response = await requestJson<SatelliteAnalyticsResponse>("/satellites/info/analytics");
  return response.data;
}
