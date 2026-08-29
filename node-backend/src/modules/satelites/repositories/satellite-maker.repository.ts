import { db } from "../../../db/index.ts";
import {
  SavedMakerSatelliteDatabaseRow,
  SatelliteMakerPreview,
  SatelliteMakerRequest,
} from "../types.ts";

const beginTransactionQuery = "BEGIN";
const commitTransactionQuery = "COMMIT";
const rollbackTransactionQuery = "ROLLBACK";

const reserveNoradIdQuery = `
  SELECT nextval('user_satellite_norad_seq')::INTEGER AS norad_cat_id
`;

const ensureClerkUserQuery = `
  INSERT INTO user_details (clerk_user_id)
  VALUES ($1)
  ON CONFLICT (clerk_user_id) DO UPDATE
  SET clerk_user_id = EXCLUDED.clerk_user_id
  RETURNING id
`;

const insertCommissionedSatelliteQuery = `
  INSERT INTO satellites (
    norad_cat_id,
    satellite_name,
    object_type,
    owner,
    operational_status,
    international_designator,
    created_by_user_id,
    orbit_center,
    orbit_type
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'EA', 'ORB')
  RETURNING id
`;

const insertCommissionedOrbitQuery = `
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
    calculated_at,
    raan_degrees,
    revolution_number,
    reference_frame,
    position_x_km,
    position_y_km,
    position_z_km,
    velocity_x_km_s,
    velocity_y_km_s,
    velocity_z_km_s
  )
  VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
    $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
  )
`;

const commissionedSatellitesQuery = `
  SELECT
    satellite.norad_cat_id,
    satellite.satellite_name,
    satellite.object_type,
    satellite.owner,
    orbit.epoch,
    orbit.tle_line2,
    orbit.height_km,
    orbit.inclination_degrees,
    orbit.raan_degrees,
    orbit.speed_km_s,
    orbit.orbital_period_minutes,
    orbit.apogee_km,
    orbit.perigee_km
  FROM satellites satellite
  JOIN LATERAL (
    SELECT
      epoch,
      tle_line2,
      height_km,
      inclination_degrees,
      raan_degrees,
      speed_km_s,
      orbital_period_minutes,
      apogee_km,
      perigee_km
    FROM satelite_orbit_data
    WHERE satellite_id = satellite.id
    ORDER BY calculated_at DESC, epoch DESC
    LIMIT 1
  ) orbit ON true
  WHERE satellite.created_by_user_id = (
    SELECT id FROM user_details WHERE clerk_user_id = $1
  )
  ORDER BY satellite.created_at DESC
  LIMIT 100
`;

const objectTypes: Record<SatelliteMakerRequest["object_type"], "PAY" | "R/B" | "DEB"> = {
  PAYLOAD: "PAY",
  ROCKET_BODY: "R/B",
  DEBRIS: "DEB",
};

export const reserveCommissionedSatelliteNoradId = async (): Promise<number> => {
  const result = await db.query<{ norad_cat_id: number }>(reserveNoradIdQuery);
  const noradCatId = result.rows[0]?.norad_cat_id;

  if (!noradCatId) {
    throw new Error("Failed to reserve a NORAD ID for the commissioned satellite");
  }

  return noradCatId;
};

export const insertCommissionedSatellite = async (request: SatelliteMakerRequest, preview: SatelliteMakerPreview, clerkUserId: string): Promise<void> => {
  const client = await db.connect();
  const current = preview.state.current;
  const propagation = preview.state.propagation;

  try {
    await client.query(beginTransactionQuery);

    const userResult = await client.query<{ id: string }>(ensureClerkUserQuery, [clerkUserId]);
    const ownerUserId = userResult.rows[0]?.id;

    if (!ownerUserId) {
      throw new Error("Failed to resolve commissioning user");
    }

    const satelliteResult = await client.query<{ id: string }>(insertCommissionedSatelliteQuery, [
      request.temporary_norad_id,
      request.object_name,
      objectTypes[request.object_type],
      request.operator,
      request.object_type === "PAYLOAD" ? "+" : null,
      `USER-${request.temporary_norad_id}`,
      ownerUserId,
    ]);
    const satelliteId = satelliteResult.rows[0]?.id;

    if (!satelliteId) {
      throw new Error("Commissioned satellite insert returned no ID");
    }

    await client.query(insertCommissionedOrbitQuery, [
      satelliteId,
      current.tle_epoch,
      preview.tle.line1,
      preview.tle.line2,
      current.inclination_degrees,
      current.orbital_period_minutes,
      current.apogee_height_km,
      current.perigee_height_km,
      current.current_height_km,
      current.current_speed_km_s,
      current.latitude_degrees,
      current.longitude_degrees,
      preview.state.calculated_at,
      current.raan_degrees,
      current.revolution_number,
      preview.state.reference_frame,
      propagation.position_km.x,
      propagation.position_km.y,
      propagation.position_km.z,
      propagation.velocity_km_s.x,
      propagation.velocity_km_s.y,
      propagation.velocity_km_s.z,
    ]);

    await client.query(commitTransactionQuery);
  } catch (error) {
    await client.query(rollbackTransactionQuery);
    throw error;
  } finally {
    client.release();
  }
};

export const findCommissionedSatellites = async (clerkUserId: string): Promise<SavedMakerSatelliteDatabaseRow[]> => {
  const result = await db.query<SavedMakerSatelliteDatabaseRow>(commissionedSatellitesQuery, [clerkUserId]);
  return result.rows;
};
