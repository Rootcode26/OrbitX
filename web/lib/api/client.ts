import type { ApiErrorPayload, ApiResponseBody } from "./types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api/v1"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function parseErrorPayload(text: string): ApiErrorPayload | null {
  if (!text) return null;

  try {
    return JSON.parse(text) as ApiErrorPayload;
  } catch {
    return null;
  }
}

async function request(
  path: string,
  init: RequestInit = {},
  accept = "application/json",
): Promise<ApiResponseBody> {
  const headers = new Headers(init.headers);
  headers.set("Accept", accept);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });
  const text = await response.text();

  if (!response.ok) {
    const payload = parseErrorPayload(text);
    const message = payload?.error
      ?? payload?.message
      ?? `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, payload?.issues ?? payload);
  }

  return { response, text };
}

export async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { text } = await request(path, init);

  if (!text) {
    throw new ApiError("The server returned an empty response", 502);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("The server returned invalid JSON", 502);
  }
}

export async function requestText(
  path: string,
  init?: RequestInit,
): Promise<string> {
  const { text } = await request(path, init, "text/plain");
  return text;
}

export async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  await request(path, init);
}
