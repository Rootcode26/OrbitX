import { requestJson } from "@/lib/api/client";
import type {
  ConjunctionAnalytics,
  ConjunctionAnalyticsResponse,
  ConjunctionCheckApiResponse,
  ConjunctionCheckRequest,
  ConjunctionCheckResult,
  ConjunctionEventListQuery,
  ConjunctionEventPage,
  ConjunctionEventRecord,
  ConjunctionEventPageResponse,
  ConjunctionEventResponse,
  ConjunctionScreenRequest,
  ConjunctionScreenResponse,
  ConjunctionScreenResult,
} from "./types";

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function checkConjunction(
  token: string,
  request: ConjunctionCheckRequest,
): Promise<ConjunctionCheckResult> {
  const response = await requestJson<ConjunctionCheckApiResponse>(
    "/satellites/info/conjunction-data",
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(request),
    },
  );

  return response.data;
}

export async function fetchConjunctionEvents(
  query: ConjunctionEventListQuery = {},
): Promise<ConjunctionEventPage> {
  const params = new URLSearchParams();
  if (query.riskLevel) params.set("risk_level", query.riskLevel);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.before) params.set("before", query.before);
  if (query.upcoming !== undefined) params.set("upcoming", String(query.upcoming));
  if (query.horizonHours !== undefined) params.set("horizon_hours", String(query.horizonHours));
  if (query.tcaWindowHours !== undefined) params.set("tca_window_hours", String(query.tcaWindowHours));
  if (query.limit !== undefined) params.set("limit", String(query.limit));

  const search = params.toString();
  const response = await requestJson<ConjunctionEventPageResponse>(
    `/satellites/info/conjunctions/events${search ? `?${search}` : ""}`,
    { cache: "no-store" },
  );
  return response.data;
}

export async function fetchConjunctionEvent(eventId: string): Promise<ConjunctionEventRecord> {
  const response = await requestJson<ConjunctionEventResponse>(
    `/satellites/info/conjunctions/events/${eventId}`,
    { cache: "no-store" },
  );
  return response.data;
}

export async function fetchConjunctionAnalytics(days = 14): Promise<ConjunctionAnalytics> {
  const response = await requestJson<ConjunctionAnalyticsResponse>(
    `/satellites/info/conjunctions/analytics?days=${days}`,
    { cache: "no-store" },
  );
  return response.data;
}

export async function screenConjunctionCandidates(
  token: string,
  request: ConjunctionScreenRequest,
): Promise<ConjunctionScreenResult> {
  const response = await requestJson<ConjunctionScreenResponse>(
    "/satellites/info/conjunctions/screen",
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(request),
    },
  );
  return response.data;
}
