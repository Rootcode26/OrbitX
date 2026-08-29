import { env } from "../../../config/env.ts";
import {
  SatelliteCurrentDataRequest,
  SatelliteCurrentDataResponse,
  Sgp4PropagationRequest,
  Sgp4PropagationResponse,
  TleData,
} from "../types.ts";

const requestPropagationService = async <TResponse>(url: string, payload: unknown, serviceName: string): Promise<TResponse> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(env.PROPAGATION_REQUEST_TIMEOUT_MS),
  });
  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `${serviceName} error: ${response.status} ${response.statusText}: ${responseBody.slice(0, 500)}`,
    );
  }

  try {
    return JSON.parse(responseBody) as TResponse;
  } catch {
    throw new Error(`${serviceName} returned invalid JSON`);
  }
};

export const sgp4PropagationDataServices = async (tleData: TleData) => requestPropagationService<unknown>(
  env.SATELLITE_CURRENT_STATE_URL,
  tleData,
  "Current satellite state service",
);

export const getSgp4PropagationDataServices = async (request: Sgp4PropagationRequest): Promise<Sgp4PropagationResponse> => requestPropagationService(
  env.PROPAGATION_URL,
  request,
  "Propagation service",
);

export const getSateliteCurrentData = async (request: SatelliteCurrentDataRequest): Promise<SatelliteCurrentDataResponse> => requestPropagationService(
  env.SATELLITE_CURRENT_STATE_URL,
  request,
  "Current satellite state service",
);
