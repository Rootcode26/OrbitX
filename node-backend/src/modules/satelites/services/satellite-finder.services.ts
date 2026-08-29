import { mapWithConcurrency } from "../../../helpers/mapWithConcurrency.ts";
import {
  getConjunctionCandidateTles,
  getLatestSatelliteTlesByNoradIds,
} from "../repositories/satelite-orbit.repository.ts";
import {
  SatelliteConjunctionScreenRequest,
  LatestSatelliteTle,
  SatelliteFinderComparisonRequest,
  SatelliteFinderComparisonResponse,
  SatelliteFinderObject,
  TleComparisonData,
} from "../types.ts";
import {
  requestConjunctionCheck,
  SatelliteTleNotFoundError,
} from "./satelites-conjuction.services.ts";
import { recordConjunctionResult } from "./conjunction-event.services.ts";

const toFinderObject = (satellite: LatestSatelliteTle): SatelliteFinderObject => ({
  norad_cat_id: satellite.norad_cat_id,
  name: satellite.satellite_name,
});

export const compareSatelliteFinderObjects = async (request: SatelliteFinderComparisonRequest): Promise<SatelliteFinderComparisonResponse> => {
  const requestedNoradIds = [request.primary_norad_id, ...request.comparison_norad_ids];
  const tleRecords = await getLatestSatelliteTlesByNoradIds(requestedNoradIds);
  const tleByNoradId = new Map(tleRecords.map((record) => [record.norad_cat_id, record]));
  const missingNoradIds = requestedNoradIds.filter((noradCatId) => !tleByNoradId.has(noradCatId));

  if (missingNoradIds.length > 0) {
    throw new SatelliteTleNotFoundError(missingNoradIds);
  }

  const primarySatellite = tleByNoradId.get(request.primary_norad_id)!;
  const comparisonSatellites = request.comparison_norad_ids.map((noradCatId) => tleByNoradId.get(noradCatId)!);
  const startTime = request.start_time ?? new Date().toISOString();

  const outcomes = await mapWithConcurrency(comparisonSatellites, 4, async (satellite) => {
    const comparisonData: TleComparisonData = {
      satellite_a: {
        norad_cat_id: String(primarySatellite.norad_cat_id),
        name: primarySatellite.satellite_name,
        tle_line1: primarySatellite.tle_line1,
        tle_line2: primarySatellite.tle_line2,
      },
      satellite_b: {
        norad_cat_id: String(satellite.norad_cat_id),
        name: satellite.satellite_name,
        tle_line1: satellite.tle_line1,
        tle_line2: satellite.tle_line2,
      },
      start_time: startTime,
      duration_minutes: request.duration_minutes ?? 1_440,
      step_seconds: request.step_seconds ?? 60,
      include_seperation_profile: request.include_separation_profile ?? false,
    };

    try {
      const result = await requestConjunctionCheck(comparisonData);
      await recordConjunctionResult({
        satellite_a_norad_id: primarySatellite.norad_cat_id,
        satellite_b_norad_id: satellite.norad_cat_id,
        start_time: startTime,
        duration_minutes: comparisonData.duration_minutes,
        step_seconds: comparisonData.step_seconds,
        include_separation_profile: request.include_separation_profile ?? false,
      }, result);

      return {
        success: true as const,
        satellite: toFinderObject(satellite),
        result,
      };
    } catch (error) {
      return {
        success: false as const,
        satellite: toFinderObject(satellite),
        message: error instanceof Error ? error.message : "Unknown conjunction service error",
      };
    }
  });

  const comparisons = outcomes
    .filter((outcome) => outcome.success)
    .map((outcome) => ({ satellite: outcome.satellite, result: outcome.result }));
  const errors = outcomes
    .filter((outcome) => !outcome.success)
    .map((outcome) => ({ satellite: outcome.satellite, message: outcome.message }));

  return {
    primary_satellite: toFinderObject(primarySatellite),
    requested: comparisonSatellites.length,
    completed: comparisons.length,
    failed: errors.length,
    comparisons,
    errors,
  };
};

export const screenSatelliteConjunctionCandidates = async (request: SatelliteConjunctionScreenRequest): Promise<SatelliteFinderComparisonResponse> => {
  const [primaryRecords, candidates] = await Promise.all([
    getLatestSatelliteTlesByNoradIds([request.primary_norad_id]),
    getConjunctionCandidateTles(request.primary_norad_id, request.candidate_limit),
  ]);

  if (primaryRecords.length === 0) {
    throw new SatelliteTleNotFoundError([request.primary_norad_id]);
  }

  if (candidates.length === 0) {
    return {
      primary_satellite: toFinderObject(primaryRecords[0]),
      requested: 0,
      completed: 0,
      failed: 0,
      comparisons: [],
      errors: [],
    };
  }

  return compareSatelliteFinderObjects({
    primary_norad_id: request.primary_norad_id,
    comparison_norad_ids: candidates.map((candidate) => candidate.norad_cat_id),
    ...(request.start_time ? { start_time: request.start_time } : {}),
    ...(request.duration_minutes ? { duration_minutes: request.duration_minutes } : {}),
    ...(request.step_seconds ? { step_seconds: request.step_seconds } : {}),
    ...(request.include_separation_profile !== undefined
      ? { include_separation_profile: request.include_separation_profile }
      : {}),
  });
};
