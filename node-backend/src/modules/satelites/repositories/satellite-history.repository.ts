import { db } from "../../../db/index.ts";
import {
  SatelliteHistoryDatabaseRow,
  SatelliteSummaryDatabaseRow,
} from "../types.ts";
import { satelliteVisibilityClause } from "./satellite-visibility.ts";

const satelliteSummaryQuery = `
  SELECT
    satellite.norad_cat_id,
    satellite.satellite_name,
    satellite.object_type,
    satellite.owner,
    satellite.operational_status
  FROM satellites satellite
  WHERE satellite.norad_cat_id = $1
    AND ${satelliteVisibilityClause("$2")}
`;

const satelliteHistoryQuery = `
  WITH complete_history AS (
    SELECT
      orbit.calculated_at,
      orbit.epoch AS tle_epoch,
      orbit.tle_line1,
      orbit.height_km,
      orbit.height_km - LAG(orbit.height_km) OVER (
        ORDER BY orbit.calculated_at ASC
      ) AS altitude_delta_km,
      orbit.apogee_km,
      orbit.perigee_km,
      orbit.inclination_degrees,
      orbit.raan_degrees,
      orbit.orbital_period_minutes,
      orbit.revolution_number
    FROM satellites satellite
    JOIN satelite_orbit_data orbit
      ON orbit.satellite_id = satellite.id
    WHERE satellite.norad_cat_id = $1
      AND ${satelliteVisibilityClause("$4")}
      AND orbit.height_km IS NOT NULL
      AND orbit.apogee_km IS NOT NULL
      AND orbit.perigee_km IS NOT NULL
      AND orbit.inclination_degrees IS NOT NULL
      AND orbit.raan_degrees IS NOT NULL
      AND orbit.orbital_period_minutes IS NOT NULL
      AND orbit.revolution_number IS NOT NULL
  )
  SELECT *
  FROM complete_history
  WHERE ($2::timestamptz IS NULL OR calculated_at < $2::timestamptz)
  ORDER BY calculated_at DESC
  LIMIT $3
`;

export const findSatelliteSummary = async (noradCatId: number, clerkUserId: string | null): Promise<SatelliteSummaryDatabaseRow | null> => {
  const result = await db.query<SatelliteSummaryDatabaseRow>(satelliteSummaryQuery, [noradCatId, clerkUserId]);

  return result.rows[0] ?? null;
};

export const findSatelliteHistory = async (noradCatId: number, limit: number, before: string | undefined, clerkUserId: string | null): Promise<SatelliteHistoryDatabaseRow[]> => {
  const values = [noradCatId, before ?? null, limit + 1, clerkUserId];
  const result = await db.query<SatelliteHistoryDatabaseRow>(satelliteHistoryQuery, values);

  return result.rows;
};
