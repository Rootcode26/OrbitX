import { requestJson } from "@/lib/api/client";

export type OperationsAlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type OperationsAlertSource =
  | "CONJUNCTION_SCREENING"
  | "ORBIT_DATA"
  | "PROPAGATION"
  | "CATALOG_SYNC"
  | "SYSTEM";
export type OperationsAlertStatusFilter = "all" | "unacknowledged" | "acknowledged" | "resolved";

export interface OperationsAlertRecord {
  id: string;
  conjunction_event_id: string | null;
  severity: OperationsAlertSeverity;
  source: OperationsAlertSource;
  title: string;
  description: string;
  acknowledged: boolean;
  resolved: boolean;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperationsAlertCollection {
  alerts: OperationsAlertRecord[];
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

export interface OperationsAlertListQuery {
  severity?: OperationsAlertSeverity;
  status?: OperationsAlertStatusFilter;
  limit?: number;
}

export interface OperationsAlertCreateRequest {
  severity: OperationsAlertSeverity;
  source: OperationsAlertSource;
  title: string;
  description: string;
  conjunction_event_id?: string;
}

interface OperationsAlertCollectionResponse {
  data: OperationsAlertCollection;
}

interface OperationsAlertRecordResponse {
  data: OperationsAlertRecord;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchAlerts(
  query: OperationsAlertListQuery = {},
): Promise<OperationsAlertCollection> {
  const params = new URLSearchParams();
  if (query.severity) params.set("severity", query.severity);
  if (query.status) params.set("status", query.status);
  if (query.limit !== undefined) params.set("limit", String(query.limit));

  const search = params.toString();
  const response = await requestJson<OperationsAlertCollectionResponse>(
    `/satellites/info/alerts${search ? `?${search}` : ""}`,
  );
  return response.data;
}

export async function createAlert(
  token: string,
  request: OperationsAlertCreateRequest,
): Promise<OperationsAlertRecord> {
  const response = await requestJson<OperationsAlertRecordResponse>("/satellites/info/alerts", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(request),
  });
  return response.data;
}

export async function acknowledgeAlert(token: string, alertId: string): Promise<OperationsAlertRecord> {
  const response = await requestJson<OperationsAlertRecordResponse>(
    `/satellites/info/alerts/${alertId}/acknowledge`,
    { method: "PATCH", headers: authHeaders(token) },
  );
  return response.data;
}

export async function resolveAlert(token: string, alertId: string): Promise<OperationsAlertRecord> {
  const response = await requestJson<OperationsAlertRecordResponse>(
    `/satellites/info/alerts/${alertId}/resolve`,
    { method: "PATCH", headers: authHeaders(token) },
  );
  return response.data;
}
