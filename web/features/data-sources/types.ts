export type DataSourceState = "available" | "empty" | "updated" | "cached" | "failed";

export type DataSourceId = "satcat" | "tle" | "propagation" | "current_state" | "conjunction";

export interface OperationsDataSource {
  id: DataSourceId;
  name: string;
  description: string;
  endpoint: string;
  state: DataSourceState;
  records: number;
  lastSync: string;
  nextSync: string;
  cadence: string;
  detail: string;
}

export interface BackendReadiness {
  status: "ready" | "not_ready";
  checks: {
    db: "ok" | "down";
  };
}

export type DataSourceStatusState = "available" | "empty" | "updated" | "cached" | "failed";

export interface DataSourceStatus {
  id: DataSourceId;
  name: string;
  status: DataSourceStatusState;
  records: number;
  last_sync_utc: string | null;
  cadence: string;
  endpoint: string;
  error?: string;
}

export interface DataSourcesResponse {
  data: { sources: DataSourceStatus[] };
}
