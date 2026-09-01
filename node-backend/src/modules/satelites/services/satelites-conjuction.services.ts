import { env } from "../../../config/env.ts";
import { CONJUNCTION_DEFAULT_SCREENING_MINUTES } from "../../../constants/index.ts";
import { getLatestSatelliteTlesByNoradIds } from "../repositories/satelite-orbit.repository.ts";
import {
  ConjunctionCheckRequest,
  ConjunctionCheckResponse,
  TleComparisonData,
} from "../types.ts";
import { recordConjunctionResult } from "./conjunction-event.services.ts";

export class SatelliteTleNotFoundError extends Error {
  constructor(public readonly noradCatIds: number[]) {
    super(`No TLE data found for NORAD IDs: ${noradCatIds.join(", ")}`);
  }
}

export class ConjunctionServiceError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export const requestConjunctionCheck = async (comparisonData: TleComparisonData): Promise<ConjunctionCheckResponse> => {
  const response = await fetch(env.CONJUNCTION_CHECK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(comparisonData),
    signal: AbortSignal.timeout(env.CONJUNCTION_REQUEST_TIMEOUT_MS),
  });

  const responseBody = await response.text();

  if (!response.ok) {
    throw new ConjunctionServiceError(
      response.status,
      `Conjunction service error: ${response.status} ${response.statusText}: ${responseBody.slice(0, 500)}`,
    );
  }

  let conjunctionData: unknown;

  try {
    conjunctionData = JSON.parse(responseBody);
  } catch {
    throw new ConjunctionServiceError(
      502,
      "Conjunction service returned invalid JSON",
    );
  }

  if (!conjunctionData || typeof conjunctionData !== "object" || Array.isArray(conjunctionData)) {
    throw new ConjunctionServiceError(
      502,
      "Conjunction service returned an invalid response body",
    );
  }

  return conjunctionData as ConjunctionCheckResponse;
};

export const checkSatelliteConjunction = async (request: ConjunctionCheckRequest): Promise<ConjunctionCheckResponse> => {
  const requestedNoradIds = [
    request.satellite_a_norad_id,
    request.satellite_b_norad_id,
  ];
  const tleRecords = await getLatestSatelliteTlesByNoradIds(requestedNoradIds);
  const tleByNoradId = new Map(
    tleRecords.map((record) => [record.norad_cat_id, record]),
  );
  const missingNoradIds = requestedNoradIds.filter(
    (noradCatId) => !tleByNoradId.has(noradCatId),
  );

  if (missingNoradIds.length > 0) {
    throw new SatelliteTleNotFoundError(missingNoradIds);
  }

  const satelliteA = tleByNoradId.get(request.satellite_a_norad_id)!;
  const satelliteB = tleByNoradId.get(request.satellite_b_norad_id)!;
  const comparisonData: TleComparisonData = {
    satellite_a: {
      norad_cat_id: String(satelliteA.norad_cat_id),
      name: satelliteA.satellite_name,
      tle_line1: satelliteA.tle_line1,
      tle_line2: satelliteA.tle_line2,
    },
    satellite_b: {
      norad_cat_id: String(satelliteB.norad_cat_id),
      name: satelliteB.satellite_name,
      tle_line1: satelliteB.tle_line1,
      tle_line2: satelliteB.tle_line2,
    },
    start_time: request.start_time ?? new Date().toISOString(),
    duration_minutes: request.duration_minutes ?? CONJUNCTION_DEFAULT_SCREENING_MINUTES,
    step_seconds: request.step_seconds ?? 60,
    include_seperation_profile: request.include_separation_profile ?? true,
  };

  const result = await requestConjunctionCheck(comparisonData);
  await recordConjunctionResult({
    satellite_a_norad_id: request.satellite_a_norad_id,
    satellite_b_norad_id: request.satellite_b_norad_id,
    start_time: comparisonData.start_time,
    duration_minutes: comparisonData.duration_minutes,
    step_seconds: comparisonData.step_seconds,
    include_separation_profile: request.include_separation_profile ?? true,
  }, result);
  return result;
};
