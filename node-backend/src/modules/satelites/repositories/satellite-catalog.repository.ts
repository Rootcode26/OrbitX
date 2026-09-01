import { db } from "../../../db/index.ts";
import {
  SatelliteCatalogDatabaseRow,
  SatelliteCatalogQuery,
} from "../types.ts";

const activeOperationalStatuses = ["+", "P", "B", "S", "X"];

const catalogSelect = `
  satellite.norad_cat_id,
  satellite.satellite_name,
  satellite.object_type,
  satellite.owner,
  satellite.operational_status,
  satellite.international_designator,
  satellite.launch_date,
  satellite.launch_site,
  satellite.decay_date,
  satellite.radar_cross_section,
  satellite.data_status_code,
  satellite.orbit_center,
  satellite.orbit_type,
  COALESCE(state.epoch, tle.epoch) AS tle_epoch,
  state.calculated_at,
  state.height_km,
  state.speed_km_s,
  state.latitude_degrees,
  state.longitude_degrees,
  COALESCE(state.inclination_degrees, tle.inclination_degrees) AS inclination_degrees,
  state.raan_degrees,
  COALESCE(state.orbital_period_minutes, tle.orbital_period_minutes) AS orbital_period_minutes,
  COALESCE(state.apogee_km, tle.apogee_km) AS apogee_km,
  COALESCE(state.perigee_km, tle.perigee_km) AS perigee_km,
  state.revolution_number,
  state.reference_frame,
  state.position_x_km,
  state.position_y_km,
  state.position_z_km,
  state.velocity_x_km_s,
  state.velocity_y_km_s,
  state.velocity_z_km_s
`;

const catalogJoins = `
  LEFT JOIN LATERAL (
    SELECT
      epoch,
      inclination_degrees,
      orbital_period_minutes,
      apogee_km,
      perigee_km
    FROM satelite_orbit_data
    WHERE satellite_id = satellite.id
    ORDER BY epoch DESC, calculated_at DESC
    LIMIT 1
  ) tle ON true
  LEFT JOIN LATERAL (
    SELECT *
    FROM satelite_orbit_data
    WHERE satellite_id = satellite.id
      AND position_x_km IS NOT NULL
      AND height_km IS NOT NULL
    ORDER BY calculated_at DESC
    LIMIT 1
  ) state ON true
`;

const altitudeExpression = `
  COALESCE(
    state.height_km,
    (tle.apogee_km + tle.perigee_km) / 2.0
  )
`;

// "Complete" means every value displayed in the catalog table is backed by
// catalog/orbit data. Optional lifecycle metadata such as decay date and data
// status is intentionally excluded because null is meaningful for live objects.
const catalogCompletenessExpression = `
  CASE WHEN
    satellite.object_type IS NOT NULL
    AND satellite.owner IS NOT NULL
    AND satellite.operational_status IS NOT NULL
    AND ${altitudeExpression} IS NOT NULL
    AND COALESCE(state.inclination_degrees, tle.inclination_degrees) IS NOT NULL
    AND state.speed_km_s IS NOT NULL
    AND state.calculated_at IS NOT NULL
  THEN 0 ELSE 1 END
`;

const catalogTypePriorityExpression = `
  CASE satellite.object_type
    WHEN 'PAY' THEN 0
    WHEN 'R/B' THEN 1
    WHEN 'DEB' THEN 2
    ELSE 3
  END
`;

interface CatalogFilter {
  where: string;
  values: unknown[];
}

const buildCatalogFilter = (query: SatelliteCatalogQuery): CatalogFilter => {
  // The catalog represents every stored SATCAT object. Live state and TLE
  // joins are optional enrichments, so records remain discoverable before
  // propagation has run.
  const clauses: string[] = [];
  const values: unknown[] = [];

  const addClause = (clause: (parameter: string) => string, value: unknown) => {
    values.push(value);
    clauses.push(clause(`$${values.length}`));
  };

  if (query.search) {
    addClause(
      (parameter) => `(
        satellite.satellite_name ILIKE ${parameter}
        OR satellite.norad_cat_id::text ILIKE ${parameter}
      )`,
      `%${query.search}%`,
    );
  }

  if (query.object_type) {
    addClause((parameter) => (
      query.object_type === "UNK"
        ? `(satellite.object_type = ${parameter} OR satellite.object_type IS NULL)`
        : `satellite.object_type = ${parameter}`
    ), query.object_type);
  }

  if (query.status === "active") {
    addClause(
      (parameter) => `satellite.operational_status = ANY(${parameter}::text[])`,
      activeOperationalStatuses,
    );
  }

  if (query.status === "inactive") {
    addClause(
      (parameter) => `NOT (satellite.operational_status = ANY(${parameter}::text[]))`,
      activeOperationalStatuses,
    );
  }

  if (query.owner) {
    addClause(
      (parameter) => `satellite.owner = ${parameter}`,
      query.owner,
    );
  }

  if (query.minimum_altitude_km !== undefined) {
    addClause(
      (parameter) => `${altitudeExpression} >= ${parameter}`,
      query.minimum_altitude_km,
    );
  }

  if (query.maximum_altitude_km !== undefined) {
    addClause(
      (parameter) => `${altitudeExpression} <= ${parameter}`,
      query.maximum_altitude_km,
    );
  }

  return {
    where: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
};

const catalogSortExpressions: Record<SatelliteCatalogQuery["sort"], string> = {
  name: "satellite.satellite_name",
  altitude: altitudeExpression,
  inclination: "COALESCE(state.inclination_degrees, tle.inclination_degrees)",
  speed: "state.speed_km_s",
};

const satelliteCatalogRecordQuery = `
  SELECT ${catalogSelect}
  FROM satellites satellite
  ${catalogJoins}
  WHERE satellite.norad_cat_id = $1
`;

const catalogOwnersQuery = `
  SELECT DISTINCT satellite.owner
  FROM satellites satellite
  WHERE satellite.owner IS NOT NULL
    AND TRIM(satellite.owner) <> ''
  ORDER BY satellite.owner
`;

const catalogAltitudeRangeQuery = `
  WITH latest_orbits AS (
    SELECT DISTINCT ON (satellite_id)
      COALESCE(height_km, (apogee_km + perigee_km) / 2.0) AS altitude_km
    FROM satelite_orbit_data
    WHERE position_x_km IS NOT NULL
      AND (
        height_km IS NOT NULL
        OR (apogee_km IS NOT NULL AND perigee_km IS NOT NULL)
      )
    ORDER BY satellite_id, epoch DESC, calculated_at DESC
  )
  SELECT
    MIN(altitude_km) AS minimum,
    MAX(altitude_km) AS maximum
  FROM latest_orbits
`;

export const findSatelliteCatalogPage = async (query: SatelliteCatalogQuery): Promise<{ rows: SatelliteCatalogDatabaseRow[]; total: number }> => {
  const filter = buildCatalogFilter(query);
  const offset = (query.page - 1) * query.page_size;
  const sortExpression = catalogSortExpressions[query.sort];
  const direction = query.direction === "desc" ? "DESC" : "ASC";
  const pageValues = [...filter.values, query.page_size, offset];
  const limitParameter = `$${filter.values.length + 1}`;
  const offsetParameter = `$${filter.values.length + 2}`;
  const pageQuery = `
    SELECT ${catalogSelect}
    FROM satellites satellite
    ${catalogJoins}
    ${filter.where}
    ORDER BY
      ${catalogCompletenessExpression} ASC,
      ${catalogTypePriorityExpression} ASC,
      ${sortExpression} ${direction} NULLS LAST,
      satellite.norad_cat_id ASC
    LIMIT ${limitParameter}
    OFFSET ${offsetParameter}
  `;
  const countQuery = `
    SELECT COUNT(*)::text AS total
    FROM satellites satellite
    ${catalogJoins}
    ${filter.where}
  `;

  const [pageResult, countResult] = await Promise.all([
    db.query<SatelliteCatalogDatabaseRow>(pageQuery, pageValues),
    db.query<{ total: string }>(countQuery, filter.values),
  ]);

  return {
    rows: pageResult.rows,
    total: Number(countResult.rows[0]?.total ?? 0),
  };
};

export const findSatelliteCatalogRecord = async (noradCatId: number): Promise<SatelliteCatalogDatabaseRow | null> => {
  const result = await db.query<SatelliteCatalogDatabaseRow>(satelliteCatalogRecordQuery, [noradCatId]);

  return result.rows[0] ?? null;
};

export const findSatelliteCatalogOptions = async (): Promise<{
  owners: string[];
  minimumAltitudeKm: number | null;
  maximumAltitudeKm: number | null;
}> => {
  const [ownersResult, altitudeResult] = await Promise.all([
    db.query<{ owner: string }>(catalogOwnersQuery),
    db.query<{ minimum: number | null; maximum: number | null }>(catalogAltitudeRangeQuery),
  ]);

  return {
    owners: ownersResult.rows.map((row) => row.owner),
    minimumAltitudeKm: altitudeResult.rows[0]?.minimum ?? null,
    maximumAltitudeKm: altitudeResult.rows[0]?.maximum ?? null,
  };
};
