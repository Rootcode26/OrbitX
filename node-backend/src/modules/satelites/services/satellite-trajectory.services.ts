import { mapWithConcurrency } from "../../../helpers/mapWithConcurrency.ts";
import { getLatestSatelliteTlesByNoradIds } from "../repositories/satelite-orbit.repository.ts";
import {
  SatelliteTrajectoryError,
  SatelliteTrajectoryPoint,
  SatelliteTrajectoryRequest,
  SatelliteTrajectoryResponse,
} from "../types.ts";
import { SatelliteTleNotFoundError } from "./satelites-conjuction.services.ts";
import { getSgp4PropagationDataServices } from "./satelites-sgp4-data.services.ts";

export class SatelliteTrajectoryServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SatelliteTrajectoryServiceError";
  }
}

const createSampleTimes = (request: SatelliteTrajectoryRequest): string[] => {
  const startTime = Date.parse(request.start_time);
  const durationMilliseconds = request.duration_minutes * 60_000;
  const stepMilliseconds = request.step_seconds * 1_000;
  const sampleTimes: string[] = [];

  for (let offset = 0; offset <= durationMilliseconds; offset += stepMilliseconds) {
    sampleTimes.push(new Date(startTime + offset).toISOString());
  }

  const endTime = new Date(startTime + durationMilliseconds).toISOString();

  if (sampleTimes.at(-1) !== endTime) {
    sampleTimes.push(endTime);
  }

  return sampleTimes;
};

export const getSatelliteTrajectory = async (request: SatelliteTrajectoryRequest): Promise<SatelliteTrajectoryResponse> => {
  const tleRecords = await getLatestSatelliteTlesByNoradIds([request.norad_cat_id]);
  const satellite = tleRecords[0];

  if (!satellite) {
    throw new SatelliteTleNotFoundError([request.norad_cat_id]);
  }

  const sampleTimes = createSampleTimes(request);
  const outcomes = await mapWithConcurrency(sampleTimes, 4, async (sampleTime) => {
    try {
      const response = await getSgp4PropagationDataServices({
        satellites: [{
          norad_cat_id: satellite.norad_cat_id,
          tle_line1: satellite.tle_line1,
          tle_line2: satellite.tle_line2,
        }],
        prediction_time: sampleTime,
      });
      const result = response.results.find((item) => item.norad_cat_id === satellite.norad_cat_id);

      if (!result) {
        const apiError = response.errors.find((item) => item.norad_cat_id === satellite.norad_cat_id);
        return {
          success: false as const,
          referenceFrame: response.reference_frame,
          error: {
            norad_cat_id: satellite.norad_cat_id,
            timestamp_utc: sampleTime,
            code: apiError?.code ?? "MISSING_RESULT",
            message: apiError?.message ?? "Propagation response contained no result",
          } satisfies SatelliteTrajectoryError,
        };
      }

      return {
        success: true as const,
        referenceFrame: response.reference_frame,
        point: {
          ...result,
          timestamp_utc: response.prediction_time_utc,
        } satisfies SatelliteTrajectoryPoint,
      };
    } catch (error) {
      return {
        success: false as const,
        referenceFrame: "",
        error: {
          norad_cat_id: satellite.norad_cat_id,
          timestamp_utc: sampleTime,
          code: "PROPAGATION_REQUEST_FAILED",
          message: error instanceof Error ? error.message : "Unknown propagation error",
        } satisfies SatelliteTrajectoryError,
      };
    }
  });

  const successfulOutcomes = outcomes.filter((outcome) => outcome.success);

  if (successfulOutcomes.length === 0) {
    throw new SatelliteTrajectoryServiceError("Propagation failed for every trajectory sample");
  }

  const points = successfulOutcomes.map((outcome) => outcome.point);
  const errors = outcomes.filter((outcome) => !outcome.success).map((outcome) => outcome.error);

  return {
    satellite: {
      norad_cat_id: satellite.norad_cat_id,
      name: satellite.satellite_name,
    },
    reference_frame: successfulOutcomes[0].referenceFrame,
    start_time_utc: sampleTimes[0],
    end_time_utc: sampleTimes.at(-1)!,
    step_seconds: request.step_seconds,
    points,
    errors,
  };
};
