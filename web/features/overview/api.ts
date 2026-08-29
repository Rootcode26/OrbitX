import { requestJson } from "@/lib/api/client";

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

interface OverviewSummaryResponse {
  data: OverviewSummary;
}

export async function fetchOverview(): Promise<OverviewSummary> {
  const response = await requestJson<OverviewSummaryResponse>("/satellites/info/overview");
  return response.data;
}
