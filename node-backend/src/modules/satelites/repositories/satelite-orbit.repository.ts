import { db } from "../../../db";
import { SatelitePropagationRequestInfo } from "./types";
import { LatestSatelliteTle } from "../types.ts";

const latestSatelliteTlesByNoradIdsQuery = `
  SELECT DISTINCT ON (satellite.norad_cat_id)
    satellite.norad_cat_id,
    satellite.satellite_name,
    orbit.tle_line1,
    orbit.tle_line2
  FROM satellites satellite
  JOIN satelite_orbit_data orbit
    ON orbit.satellite_id = satellite.id
  WHERE satellite.norad_cat_id = ANY($1::integer[])
  ORDER BY
    satellite.norad_cat_id,
    orbit.epoch DESC,
    orbit.calculated_at DESC
`;

const conjunctionCandidateTlesQuery = `
  WITH primary_orbit AS (
    SELECT
      COALESCE(orbit.height_km, (orbit.apogee_km + orbit.perigee_km) / 2.0) AS altitude_km,
      orbit.inclination_degrees
    FROM satellites satellite
    JOIN satelite_orbit_data orbit
      ON orbit.satellite_id = satellite.id
    WHERE satellite.norad_cat_id = $1
      AND COALESCE(orbit.height_km, (orbit.apogee_km + orbit.perigee_km) / 2.0) IS NOT NULL
    ORDER BY orbit.calculated_at DESC, orbit.epoch DESC
    LIMIT 1
  ),
  candidate_orbits AS (
    SELECT DISTINCT ON (satellite.id)
      satellite.norad_cat_id,
      satellite.satellite_name,
      orbit.tle_line1,
      orbit.tle_line2,
      COALESCE(orbit.height_km, (orbit.apogee_km + orbit.perigee_km) / 2.0) AS altitude_km,
      orbit.inclination_degrees
    FROM satellites satellite
    JOIN satelite_orbit_data orbit
      ON orbit.satellite_id = satellite.id
    WHERE satellite.norad_cat_id <> $1
      AND orbit.tle_line1 IS NOT NULL
      AND orbit.tle_line2 IS NOT NULL
      AND COALESCE(orbit.height_km, (orbit.apogee_km + orbit.perigee_km) / 2.0) IS NOT NULL
    ORDER BY satellite.id, orbit.calculated_at DESC, orbit.epoch DESC
  )
  SELECT
    candidate.norad_cat_id,
    candidate.satellite_name,
    candidate.tle_line1,
    candidate.tle_line2
  FROM candidate_orbits candidate
  CROSS JOIN primary_orbit primary_state
  ORDER BY
    ABS(candidate.altitude_km - primary_state.altitude_km) ASC,
    ABS(COALESCE(candidate.inclination_degrees, 0) - COALESCE(primary_state.inclination_degrees, 0)) ASC,
    candidate.norad_cat_id ASC
  LIMIT $2
`;

const latestPropagationTlesQuery = `
  WITH latest AS (
    SELECT DISTINCT ON (satellite.id)
      satellite.norad_cat_id,
      satellite.object_type,
      orbit.epoch,
      orbit.tle_line1,
      orbit.tle_line2
    FROM satellites satellite
    JOIN satelite_orbit_data orbit ON orbit.satellite_id = satellite.id
    WHERE orbit.tle_line1 IS NOT NULL
      AND orbit.tle_line2 IS NOT NULL
      AND orbit.apogee_km <= 2000
    ORDER BY satellite.id, orbit.epoch DESC, orbit.calculated_at DESC
  ),
  ranked AS (
    SELECT
      latest.*,
      ROW_NUMBER() OVER (
        PARTITION BY CASE WHEN object_type = 'DEB' THEN 'DEB' ELSE 'SATELLITE' END
        ORDER BY epoch DESC, norad_cat_id ASC
      ) AS type_rank
    FROM latest
  ),
  prioritized AS (
    SELECT
      ranked.*,
      CASE
        WHEN object_type = 'DEB' AND type_rank <= $2 THEN 0
        WHEN object_type <> 'DEB' AND type_rank <= ($1 - $2) THEN 0
        ELSE 1
      END AS quota_priority
    FROM ranked
  )
  SELECT norad_cat_id, tle_line1, tle_line2
  FROM prioritized
  ORDER BY quota_priority, epoch DESC, norad_cat_id ASC
  LIMIT $1
`;

const allLatestPropagationTlesQuery = `
  SELECT DISTINCT ON (satellite.id)
    satellite.norad_cat_id,
    orbit.tle_line1,
    orbit.tle_line2
  FROM satellites satellite
  JOIN satelite_orbit_data orbit
    ON orbit.satellite_id = satellite.id
  WHERE orbit.tle_line1 IS NOT NULL
    AND orbit.tle_line2 IS NOT NULL
  ORDER BY
    satellite.id,
    orbit.epoch DESC NULLS LAST,
    orbit.calculated_at DESC
`;

export const getLatestSatelliteTlesByNoradIds = async (noradCatIds: number[]): Promise<LatestSatelliteTle[]> => {
  if (noradCatIds.length === 0) return [];

  const result = await db.query<LatestSatelliteTle>(latestSatelliteTlesByNoradIdsQuery, [noradCatIds]);

  return result.rows;
};

export const getConjunctionCandidateTles = async (primaryNoradId: number, limit: number): Promise<LatestSatelliteTle[]> => {
  const result = await db.query<LatestSatelliteTle>(conjunctionCandidateTlesQuery, [primaryNoradId, limit]);

  return result.rows;
};

export const getLatestSateliteTleRecords = async (limit: number, debrisLimit: number) => {
  const normalizedDebrisLimit = Math.min(Math.max(debrisLimit, 0), limit);
  const data = await db.query(latestPropagationTlesQuery, [limit, normalizedDebrisLimit]);

  const satelites = data.rows.map((satelite: SatelitePropagationRequestInfo) => {
    return {
      norad_cat_id: satelite.norad_cat_id,
      tle_line1: satelite.tle_line1,
      tle_line2: satelite.tle_line2
    }
  });

  return satelites;
};

export const getAllLatestOrbitalObjectTleRecords = async () => {
  const data = await db.query<SatelitePropagationRequestInfo>(allLatestPropagationTlesQuery);

  return data.rows.map((satelite) => ({
    norad_cat_id: satelite.norad_cat_id,
    tle_line1: satelite.tle_line1,
    tle_line2: satelite.tle_line2,
  }));
};
