import { db } from "../../../db/index.ts";
import {
  CurrentStateDatabaseUpdate,
  PropagationDatabaseUpdate,
  SatelliteCurrentDataResponse,
  Sgp4PropagationRequest,
  Sgp4PropagationResponse,
  StoredNoradIdsRow,
  StorePropagationResultsSummary,
} from "../types.ts";

const parseTimestamp = (value: string, field: string): number => {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid ${field}: ${value}`);
  }

  return timestamp;
};

const getStoredNoradIds = (rows: StoredNoradIdsRow[]): number[] =>
  rows[0]?.stored_norad_ids ?? [];

export const storeSatellitePropagationResults = async (tleRecords: Sgp4PropagationRequest["satellites"], propagationData: Sgp4PropagationResponse, currentStateData: SatelliteCurrentDataResponse): Promise<StorePropagationResultsSummary> => {
  const tleByNoradId = new Map(
    tleRecords.map((record) => [record.norad_cat_id, record]),
  );
  const requestedNoradIds = [...tleByNoradId.keys()];

  if (requestedNoradIds.length === 0) {
    return { requested: 0, stored: 0, skippedNoradIds: [] };
  }

  const predictionTime = parseTimestamp(
    propagationData.prediction_time_utc,
    "prediction_time_utc",
  );
  const observationTime = parseTimestamp(
    currentStateData.observation_time_utc,
    "observation_time_utc",
  );

  if (predictionTime !== observationTime) {
    throw new Error(
      "Propagation and current-state responses were calculated for different times",
    );
  }

  const referenceFrame = propagationData.reference_frame.trim();
  if (referenceFrame.length === 0) {
    throw new Error("Propagation response has no reference frame");
  }

  const propagationByNoradId = new Map(
    propagationData.results.map((result) => [result.norad_cat_id, result]),
  );
  const currentStateByNoradId = new Map(
    currentStateData.results.map((result) => [result.norad_cat_id, result]),
  );

  const propagationUpdates: PropagationDatabaseUpdate[] = [];
  const currentStateUpdates: CurrentStateDatabaseUpdate[] = [];

  for (const [noradCatId, tle] of tleByNoradId) {
    const propagation = propagationByNoradId.get(noradCatId);
    const currentState = currentStateByNoradId.get(noradCatId);

    if (!propagation || !currentState) continue;

    propagationUpdates.push({
      norad_cat_id: noradCatId,
      tle_epoch: currentState.tle_epoch,
      tle_line1: tle.tle_line1,
      tle_line2: tle.tle_line2,
      reference_frame: referenceFrame,
      position_x_km: propagation.position_km.x,
      position_y_km: propagation.position_km.y,
      position_z_km: propagation.position_km.z,
      velocity_x_km_s: propagation.velocity_km_s.x,
      velocity_y_km_s: propagation.velocity_km_s.y,
      velocity_z_km_s: propagation.velocity_km_s.z,
      calculated_at: propagationData.prediction_time_utc,
    });

    currentStateUpdates.push({
      norad_cat_id: noradCatId,
      tle_epoch: currentState.tle_epoch,
      tle_line1: tle.tle_line1,
      tle_line2: tle.tle_line2,
      inclination_degrees: currentState.inclination_degrees,
      orbital_period_minutes: currentState.orbital_period_minutes,
      apogee_km: currentState.apogee_height_km,
      perigee_km: currentState.perigee_height_km,
      height_km: currentState.current_height_km,
      speed_km_s: currentState.current_speed_km_s,
      latitude_degrees: currentState.latitude_degrees,
      longitude_degrees: currentState.longitude_degrees,
      raan_degrees: currentState.raan_degrees,
      revolution_number: currentState.revolution_number,
      calculated_at: currentStateData.observation_time_utc,
    });
  }

  const successfulNoradIds = propagationUpdates.map(
    (record) => record.norad_cat_id,
  );
  const successfulNoradIdSet = new Set(successfulNoradIds);
  const skippedNoradIds = requestedNoradIds.filter(
    (noradCatId) => !successfulNoradIdSet.has(noradCatId),
  );

  if (successfulNoradIds.length === 0) {
    return {
      requested: requestedNoradIds.length,
      stored: 0,
      skippedNoradIds,
    };
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const propagationResult = await client.query<StoredNoradIdsRow>(
      `
        WITH incoming AS (
          SELECT *
          FROM jsonb_to_recordset($1::jsonb) AS record(
            norad_cat_id INTEGER,
            tle_epoch TIMESTAMPTZ,
            tle_line1 TEXT,
            tle_line2 TEXT,
            reference_frame VARCHAR(16),
            position_x_km DOUBLE PRECISION,
            position_y_km DOUBLE PRECISION,
            position_z_km DOUBLE PRECISION,
            velocity_x_km_s DOUBLE PRECISION,
            velocity_y_km_s DOUBLE PRECISION,
            velocity_z_km_s DOUBLE PRECISION,
            calculated_at TIMESTAMPTZ
          )
        ),
        stored AS (
          INSERT INTO satelite_orbit_data (
            satellite_id,
            epoch,
            tle_line1,
            tle_line2,
            reference_frame,
            position_x_km,
            position_y_km,
            position_z_km,
            velocity_x_km_s,
            velocity_y_km_s,
            velocity_z_km_s,
            calculated_at
          )
          SELECT
            satellite.id,
            incoming.tle_epoch,
            incoming.tle_line1,
            incoming.tle_line2,
            incoming.reference_frame,
            incoming.position_x_km,
            incoming.position_y_km,
            incoming.position_z_km,
            incoming.velocity_x_km_s,
            incoming.velocity_y_km_s,
            incoming.velocity_z_km_s,
            incoming.calculated_at
          FROM incoming
          JOIN satellites satellite
            ON satellite.norad_cat_id = incoming.norad_cat_id
          ON CONFLICT (satellite_id, calculated_at) DO UPDATE SET
            epoch = EXCLUDED.epoch,
            tle_line1 = EXCLUDED.tle_line1,
            tle_line2 = EXCLUDED.tle_line2,
            reference_frame = EXCLUDED.reference_frame,
            position_x_km = EXCLUDED.position_x_km,
            position_y_km = EXCLUDED.position_y_km,
            position_z_km = EXCLUDED.position_z_km,
            velocity_x_km_s = EXCLUDED.velocity_x_km_s,
            velocity_y_km_s = EXCLUDED.velocity_y_km_s,
            velocity_z_km_s = EXCLUDED.velocity_z_km_s,
            calculated_at = EXCLUDED.calculated_at
          RETURNING satellite_id
        )
        SELECT COALESCE(
          ARRAY_AGG(satellite.norad_cat_id),
          ARRAY[]::INTEGER[]
        ) AS stored_norad_ids
        FROM stored
        JOIN satellites satellite
          ON satellite.id = stored.satellite_id
      `,
      [JSON.stringify(propagationUpdates)],
    );

    const currentStateResult = await client.query<StoredNoradIdsRow>(
      `
        WITH incoming AS (
          SELECT *
          FROM jsonb_to_recordset($1::jsonb) AS record(
            norad_cat_id INTEGER,
            tle_epoch TIMESTAMPTZ,
            tle_line1 TEXT,
            tle_line2 TEXT,
            inclination_degrees DOUBLE PRECISION,
            orbital_period_minutes DOUBLE PRECISION,
            apogee_km DOUBLE PRECISION,
            perigee_km DOUBLE PRECISION,
            height_km DOUBLE PRECISION,
            speed_km_s DOUBLE PRECISION,
            latitude_degrees DOUBLE PRECISION,
            longitude_degrees DOUBLE PRECISION,
            raan_degrees DOUBLE PRECISION,
            revolution_number INTEGER,
            calculated_at TIMESTAMPTZ
          )
        ),
        stored AS (
          INSERT INTO satelite_orbit_data (
            satellite_id,
            epoch,
            tle_line1,
            tle_line2,
            inclination_degrees,
            orbital_period_minutes,
            apogee_km,
            perigee_km,
            height_km,
            speed_km_s,
            latitude_degrees,
            longitude_degrees,
            raan_degrees,
            revolution_number,
            calculated_at
          )
          SELECT
            satellite.id,
            incoming.tle_epoch,
            incoming.tle_line1,
            incoming.tle_line2,
            incoming.inclination_degrees,
            incoming.orbital_period_minutes,
            incoming.apogee_km,
            incoming.perigee_km,
            incoming.height_km,
            incoming.speed_km_s,
            incoming.latitude_degrees,
            incoming.longitude_degrees,
            incoming.raan_degrees,
            incoming.revolution_number,
            incoming.calculated_at
          FROM incoming
          JOIN satellites satellite
            ON satellite.norad_cat_id = incoming.norad_cat_id
          ON CONFLICT (satellite_id, calculated_at) DO UPDATE SET
            epoch = EXCLUDED.epoch,
            tle_line1 = EXCLUDED.tle_line1,
            tle_line2 = EXCLUDED.tle_line2,
            inclination_degrees = EXCLUDED.inclination_degrees,
            orbital_period_minutes = EXCLUDED.orbital_period_minutes,
            apogee_km = EXCLUDED.apogee_km,
            perigee_km = EXCLUDED.perigee_km,
            height_km = EXCLUDED.height_km,
            speed_km_s = EXCLUDED.speed_km_s,
            latitude_degrees = EXCLUDED.latitude_degrees,
            longitude_degrees = EXCLUDED.longitude_degrees,
            raan_degrees = EXCLUDED.raan_degrees,
            revolution_number = EXCLUDED.revolution_number,
            calculated_at = EXCLUDED.calculated_at
          RETURNING satellite_id
        )
        SELECT COALESCE(
          ARRAY_AGG(satellite.norad_cat_id),
          ARRAY[]::INTEGER[]
        ) AS stored_norad_ids
        FROM stored
        JOIN satellites satellite
          ON satellite.id = stored.satellite_id
      `,
      [JSON.stringify(currentStateUpdates)],
    );

    const propagationNoradIds = getStoredNoradIds(propagationResult.rows);
    const currentStateNoradIds = getStoredNoradIds(currentStateResult.rows);
    const propagationNoradSet = new Set(propagationNoradIds);
    const currentStateNoradSet = new Set(currentStateNoradIds);

    const allSuccessfulRowsStored = successfulNoradIds.every(
      (noradCatId) =>
        propagationNoradSet.has(noradCatId)
        && currentStateNoradSet.has(noradCatId),
    );

    if (!allSuccessfulRowsStored) {
      throw new Error(
        "Not every successful API result was stored for a known satellite",
      );
    }

    await client.query("COMMIT");

    return {
      requested: requestedNoradIds.length,
      stored: successfulNoradIds.length,
      skippedNoradIds,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
