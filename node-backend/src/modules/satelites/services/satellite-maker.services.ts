import { mapWithConcurrency } from "../../../helpers/mapWithConcurrency.ts";
import { getLatestSatelliteTlesByNoradIds } from "../repositories/satelite-orbit.repository.ts";
import {
  findCommissionedSatellites,
  insertCommissionedSatellite,
  reserveCommissionedSatelliteNoradId,
} from "../repositories/satellite-maker.repository.ts";
import {
  CommissionedSatellite,
  SavedMakerSatellite,
  SatelliteMakerConjunctionResult,
  SatelliteMakerPreview,
  SatelliteMakerRequest,
  TleComparisonData,
} from "../types.ts";
import {
  getSateliteCurrentData,
  getSgp4PropagationDataServices,
} from "./satelites-sgp4-data.services.ts";
import {
  requestConjunctionCheck,
  SatelliteTleNotFoundError,
} from "./satelites-conjuction.services.ts";
import { buildMakerTle, deriveMakerOrbit } from "./tle-builder.services.ts";

export class SatelliteMakerServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SatelliteMakerServiceError";
  }
}

export class SatelliteAlreadyCommissionedError extends Error {
  constructor(public readonly noradCatId: number) {
    super(`A satellite with NORAD ID ${noradCatId} already exists`);
    this.name = "SatelliteAlreadyCommissionedError";
  }
}

const checkMakerConjunctions = async (request: SatelliteMakerRequest, tle: { line1: string; line2: string }): Promise<SatelliteMakerConjunctionResult[]> => {
  if (request.comparison_norad_ids.length === 0) return [];

  const comparisonSatellites = await getLatestSatelliteTlesByNoradIds(
    request.comparison_norad_ids,
  );
  const foundNoradIds = new Set(
    comparisonSatellites.map((satellite) => satellite.norad_cat_id),
  );
  const missingNoradIds = request.comparison_norad_ids.filter(
    (noradCatId) => !foundNoradIds.has(noradCatId),
  );

  if (missingNoradIds.length > 0) {
    throw new SatelliteTleNotFoundError(missingNoradIds);
  }

  return mapWithConcurrency(comparisonSatellites, 4, async (satellite) => {
    const comparison: TleComparisonData = {
      satellite_a: {
        norad_cat_id: String(request.temporary_norad_id),
        name: request.object_name,
        tle_line1: tle.line1,
        tle_line2: tle.line2,
      },
      satellite_b: {
        norad_cat_id: String(satellite.norad_cat_id),
        name: satellite.satellite_name,
        tle_line1: satellite.tle_line1,
        tle_line2: satellite.tle_line2,
      },
      start_time: request.epoch_utc,
      duration_minutes: 1_440,
      step_seconds: 60,
      include_seperation_profile: true,
    };

    return {
      norad_cat_id: satellite.norad_cat_id,
      name: satellite.satellite_name,
      result: await requestConjunctionCheck(comparison),
    };
  });
};

export const previewSatellite = async (request: SatelliteMakerRequest): Promise<SatelliteMakerPreview> => {
  const orbit = deriveMakerOrbit(request);
  const tle = buildMakerTle(request, orbit);
  const satellite = {
    norad_cat_id: request.temporary_norad_id,
    tle_line1: tle.line1,
    tle_line2: tle.line2,
  };

  let propagationResponse;
  let currentStateResponse;

  try {
    [propagationResponse, currentStateResponse] = await Promise.all([
      getSgp4PropagationDataServices({
        satellites: [satellite],
        prediction_time: request.epoch_utc,
      }),
      getSateliteCurrentData({
        satellites: [satellite],
        observation_time: request.epoch_utc,
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown propagation error";
    throw new SatelliteMakerServiceError(message);
  }

  const propagation = propagationResponse.results.find(
    (result) => result.norad_cat_id === request.temporary_norad_id,
  );
  const current = currentStateResponse.results.find(
    (result) => result.norad_cat_id === request.temporary_norad_id,
  );

  if (!propagation || !current) {
    throw new SatelliteMakerServiceError(
      "Propagation services did not return a state for the temporary satellite",
    );
  }

  const conjunctions = await checkMakerConjunctions(request, tle);

  return {
    satellite: {
      norad_cat_id: request.temporary_norad_id,
      name: request.object_name,
      operator: request.operator,
      country: request.country,
      object_type: request.object_type,
    },
    tle,
    orbit,
    state: {
      propagation,
      current,
      reference_frame: propagationResponse.reference_frame,
      calculated_at: propagationResponse.prediction_time_utc,
    },
    conjunctions,
  };
};

export const commissionSatellite = async (request: SatelliteMakerRequest, clerkUserId: string): Promise<CommissionedSatellite> => {
  const assignedNoradId = await reserveCommissionedSatelliteNoradId();
  const commissionedRequest: SatelliteMakerRequest = {
    ...request,
    temporary_norad_id: assignedNoradId,
    comparison_norad_ids: request.comparison_norad_ids.filter((noradCatId) => noradCatId !== assignedNoradId),
  };
  const preview = await previewSatellite(commissionedRequest);

  try {
    await insertCommissionedSatellite(commissionedRequest, preview, clerkUserId);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw new SatelliteAlreadyCommissionedError(assignedNoradId);
    }

    throw error;
  }

  return {
    norad_cat_id: assignedNoradId,
    name: commissionedRequest.object_name,
    object_type: commissionedRequest.object_type,
    operator: commissionedRequest.operator,
    country: commissionedRequest.country,
    calculated_at: preview.state.calculated_at,
    tle_epoch: preview.state.current.tle_epoch,
  };
};

const makerObjectTypes: Record<"PAY" | "R/B" | "DEB", SavedMakerSatellite["object_type"]> = {
  PAY: "PAYLOAD",
  "R/B": "ROCKET_BODY",
  DEB: "DEBRIS",
};

const numberOr = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseMakerOrbitAngles = (tleLine2: string) => {
  const fields = tleLine2.trim().split(/\s+/);
  return {
    raanDegrees: numberOr(fields[3], 0),
    argumentOfPerigeeDegrees: numberOr(fields[5], 0),
    phaseDegrees: numberOr(fields[6], 0),
    eccentricity: numberOr(`0.${fields[4] ?? "0"}`, 0),
  };
};

export const getCommissionedSatellites = async (clerkUserId: string): Promise<SavedMakerSatellite[]> => {
  const rows = await findCommissionedSatellites(clerkUserId);

  return rows.map((row) => {
    const angles = parseMakerOrbitAngles(row.tle_line2);
    const semiMajorAxisKm = row.apogee_km !== null && row.perigee_km !== null
      ? 6371 + (row.apogee_km + row.perigee_km) / 2
      : null;
    const eccentricity = semiMajorAxisKm && row.apogee_km !== null && row.perigee_km !== null
      ? (row.apogee_km - row.perigee_km) / (2 * semiMajorAxisKm)
      : angles.eccentricity;

    return {
      norad_cat_id: row.norad_cat_id,
      name: row.satellite_name,
      object_type: makerObjectTypes[row.object_type],
      operator: row.owner ?? "Unknown",
      epoch_utc: row.epoch.toISOString(),
      altitude_km: row.height_km,
      inclination_degrees: row.inclination_degrees,
      raan_degrees: row.raan_degrees ?? angles.raanDegrees,
      argument_of_perigee_degrees: angles.argumentOfPerigeeDegrees,
      phase_degrees: angles.phaseDegrees,
      eccentricity,
      velocity_km_s: row.speed_km_s,
      orbital_period_minutes: row.orbital_period_minutes,
    };
  });
};
