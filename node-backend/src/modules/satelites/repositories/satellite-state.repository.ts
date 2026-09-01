import { db } from "../../../db/index.ts";
import {
  NearbySatelliteStateDatabaseRow,
  SatelliteStateDatabaseRow,
} from "../types.ts";
import { satelliteVisibilityClause } from "./satellite-visibility.ts";

const satelliteStateColumns = `
  satellite.norad_cat_id,
  satellite.satellite_name,
  satellite.object_type,
  satellite.owner,
  satellite.operational_status,
  satellite.radar_cross_section,
  orbit.calculated_at,
  orbit.epoch AS tle_epoch,
  orbit.reference_frame,
  orbit.position_x_km,
  orbit.position_y_km,
  orbit.position_z_km,
  orbit.velocity_x_km_s,
  orbit.velocity_y_km_s,
  orbit.velocity_z_km_s,
  orbit.height_km,
  orbit.speed_km_s,
  orbit.latitude_degrees,
  orbit.longitude_degrees,
  orbit.inclination_degrees,
  orbit.raan_degrees,
  orbit.orbital_period_minutes,
  orbit.apogee_km,
  orbit.perigee_km,
  orbit.revolution_number
`;

const completeStatePredicate = `
  orbit.reference_frame IS NOT NULL
  AND orbit.position_x_km IS NOT NULL
  AND orbit.position_y_km IS NOT NULL
  AND orbit.position_z_km IS NOT NULL
  AND orbit.velocity_x_km_s IS NOT NULL
  AND orbit.velocity_y_km_s IS NOT NULL
  AND orbit.velocity_z_km_s IS NOT NULL
  AND orbit.height_km IS NOT NULL
  AND orbit.speed_km_s IS NOT NULL
  AND orbit.latitude_degrees IS NOT NULL
  AND orbit.longitude_degrees IS NOT NULL
  AND orbit.inclination_degrees IS NOT NULL
  AND orbit.raan_degrees IS NOT NULL
  AND orbit.orbital_period_minutes IS NOT NULL
  AND orbit.apogee_km IS NOT NULL
  AND orbit.perigee_km IS NOT NULL
  AND orbit.revolution_number IS NOT NULL
`;

const latestSatelliteStatesQuery = `
  WITH latest_states AS (
    SELECT DISTINCT ON (orbit.satellite_id)
      orbit.*
    FROM satelite_orbit_data orbit
    WHERE ${completeStatePredicate}
    ORDER BY orbit.satellite_id, orbit.calculated_at DESC
  ),
  ranked_states AS (
    SELECT
      latest_states.*,
      satellite.object_type,
      ROW_NUMBER() OVER (
        PARTITION BY satellite.object_type
        ORDER BY latest_states.calculated_at DESC, satellite.norad_cat_id ASC
      ) AS type_rank
    FROM latest_states
    JOIN satellites satellite
      ON satellite.id = latest_states.satellite_id
    WHERE ${satelliteVisibilityClause("$2")}
  ),
  prioritized_states AS (
    SELECT
      ranked_states.*,
      CASE
        WHEN object_type = 'PAY' AND type_rank <= FLOOR($1 * 0.70) THEN 0
        WHEN object_type = 'DEB' AND type_rank <= FLOOR($1 * 0.25) THEN 0
        WHEN object_type = 'R/B' AND type_rank <= ($1 - FLOOR($1 * 0.70) - FLOOR($1 * 0.25)) THEN 0
        ELSE 1
      END AS quota_priority,
      CASE object_type
        WHEN 'PAY' THEN 0
        WHEN 'R/B' THEN 1
        WHEN 'DEB' THEN 2
        ELSE 3
      END AS type_priority
    FROM ranked_states
  )
  SELECT ${satelliteStateColumns}
  FROM prioritized_states orbit
  JOIN satellites satellite
    ON satellite.id = orbit.satellite_id
  ORDER BY orbit.quota_priority ASC, orbit.type_priority ASC, orbit.calculated_at DESC, satellite.norad_cat_id ASC
  LIMIT $1
`;

const latestSatelliteStateQuery = `
  SELECT ${satelliteStateColumns}
  FROM satelite_orbit_data orbit
  JOIN satellites satellite
    ON satellite.id = orbit.satellite_id
  WHERE satellite.norad_cat_id = $1
    AND ${satelliteVisibilityClause("$2")}
    AND ${completeStatePredicate}
  ORDER BY orbit.calculated_at DESC
  LIMIT 1
`;

const nearbySatelliteStatesQuery = `
  WITH latest_states AS (
    SELECT DISTINCT ON (orbit.satellite_id)
      orbit.*
    FROM satelite_orbit_data orbit
    WHERE ${completeStatePredicate}
    ORDER BY orbit.satellite_id, orbit.calculated_at DESC
  ),
  primary_state AS (
    SELECT orbit.*
    FROM latest_states orbit
    JOIN satellites satellite
      ON satellite.id = orbit.satellite_id
    WHERE satellite.norad_cat_id = $1
  ),
  nearby_states AS (
    SELECT
      ${satelliteStateColumns},
      SQRT(
        POWER(orbit.position_x_km - reference.position_x_km, 2)
        + POWER(orbit.position_y_km - reference.position_y_km, 2)
        + POWER(orbit.position_z_km - reference.position_z_km, 2)
      )::double precision AS separation_km,
      SQRT(
        POWER(orbit.velocity_x_km_s - reference.velocity_x_km_s, 2)
        + POWER(orbit.velocity_y_km_s - reference.velocity_y_km_s, 2)
        + POWER(orbit.velocity_z_km_s - reference.velocity_z_km_s, 2)
      )::double precision AS relative_velocity_km_s
    FROM latest_states orbit
    JOIN satellites satellite
      ON satellite.id = orbit.satellite_id
    CROSS JOIN primary_state reference
    WHERE orbit.satellite_id <> reference.satellite_id
      AND orbit.reference_frame = reference.reference_frame
      -- Only compare states propagated to the same instant as the reference, so
      -- the separation differences positions at one epoch (never mixes times
      -- when a propagation run skipped or lagged some objects).
      AND orbit.calculated_at = reference.calculated_at
      AND ${satelliteVisibilityClause("$5")}
      AND (
        POWER(orbit.position_x_km - reference.position_x_km, 2)
        + POWER(orbit.position_y_km - reference.position_y_km, 2)
        + POWER(orbit.position_z_km - reference.position_z_km, 2)
      ) <= POWER($2::double precision, 2)
  )
  SELECT
    nearby_states.*,
    COUNT(*) OVER()::text AS total_count
  FROM nearby_states
  ORDER BY separation_km ASC, norad_cat_id ASC
  LIMIT $3
  OFFSET $4
`;

export const findLatestSatelliteStates = async (limit: number, clerkUserId: string | null): Promise<SatelliteStateDatabaseRow[]> => {
  const result = await db.query<SatelliteStateDatabaseRow>(latestSatelliteStatesQuery, [limit, clerkUserId]);

  return result.rows;
};

export const findLatestSatelliteState = async (noradCatId: number, clerkUserId: string | null): Promise<SatelliteStateDatabaseRow | null> => {
  const result = await db.query<SatelliteStateDatabaseRow>(latestSatelliteStateQuery, [noradCatId, clerkUserId]);

  return result.rows[0] ?? null;
};

export const findNearbySatelliteStates = async (
  primaryNoradCatId: number,
  radiusKm: number,
  page: number,
  pageSize: number,
  clerkUserId: string | null,
): Promise<{ rows: NearbySatelliteStateDatabaseRow[]; total: number }> => {
  const offset = (page - 1) * pageSize;
  const result = await db.query<NearbySatelliteStateDatabaseRow>(nearbySatelliteStatesQuery, [
    primaryNoradCatId,
    radiusKm,
    pageSize,
    offset,
    clerkUserId,
  ]);

  return {
    rows: result.rows,
    total: Number(result.rows[0]?.total_count ?? 0),
  };
};
