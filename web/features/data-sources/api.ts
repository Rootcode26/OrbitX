import { requestJson } from "@/lib/api/client";
import type { BackendReadiness, DataSourcesResponse, DataSourceStatus } from "./types";

export function fetchBackendReadiness(): Promise<BackendReadiness> {
  return requestJson("/health/ready");
}

export async function fetchDataSources(): Promise<DataSourceStatus[]> {
  const response = await requestJson<DataSourcesResponse>("/satellites/info/sources");
  return response.data.sources;
}
