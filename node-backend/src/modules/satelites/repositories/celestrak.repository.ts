import { db } from "../../../db/index.ts";
import {
  SatcatRecord,
  StoredTleRecord,
  TleRecord,
} from "../celestrak.types.ts";

export interface CelestrakCacheSummary {
  satellites: number;
  tleRecords: number;
}

const celestrakCacheSummaryQuery = `
  SELECT
    (SELECT COUNT(*) FROM satellites)::text AS satellites,
    (SELECT COUNT(DISTINCT satellite_id) FROM satelite_orbit_data)::text AS tle_records
`;

const storedTleRecordsQuery = `
  SELECT DISTINCT ON (satellites.id)
    satellites.norad_cat_id,
    satellites.satellite_name,
    orbit.epoch,
    orbit.tle_line1,
    orbit.tle_line2
  FROM satellites
  JOIN satelite_orbit_data orbit
    ON orbit.satellite_id = satellites.id
  ORDER BY satellites.id, orbit.epoch DESC, orbit.calculated_at DESC
`;

export const upsertSatcatRecords = async (records: SatcatRecord[]): Promise<number> => {
  if (records.length === 0) return 0;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        INSERT INTO satellites (
          norad_cat_id,
          satellite_name,
          object_type,
          owner,
          operational_status,
          launch_date,
          launch_site,
          decay_date,
          international_designator,
          radar_cross_section,
          data_status_code,
          orbit_center,
          orbit_type
        )
        SELECT *
        FROM UNNEST(
          $1::integer[],
          $2::text[],
          $3::varchar[],
          $4::text[],
          $5::char[],
          $6::date[],
          $7::text[],
          $8::date[],
          $9::varchar[],
          $10::double precision[],
          $11::varchar[],
          $12::varchar[],
          $13::varchar[]
        )
        ON CONFLICT (norad_cat_id) DO UPDATE SET
          satellite_name = EXCLUDED.satellite_name,
          object_type = EXCLUDED.object_type,
          owner = EXCLUDED.owner,
          operational_status = EXCLUDED.operational_status,
          launch_date = EXCLUDED.launch_date,
          launch_site = EXCLUDED.launch_site,
          decay_date = EXCLUDED.decay_date,
          international_designator = EXCLUDED.international_designator,
          radar_cross_section = EXCLUDED.radar_cross_section,
          data_status_code = EXCLUDED.data_status_code,
          orbit_center = EXCLUDED.orbit_center,
          orbit_type = EXCLUDED.orbit_type,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        records.map((record) => record.noradCatId),
        records.map((record) => record.satelliteName),
        records.map((record) => record.objectType),
        records.map((record) => record.owner),
        records.map((record) => record.operationalStatus),
        records.map((record) => record.launchDate),
        records.map((record) => record.launchSite),
        records.map((record) => record.decayDate),
        records.map((record) => record.internationalDesignator),
        records.map((record) => record.radarCrossSection),
        records.map((record) => record.dataStatusCode),
        records.map((record) => record.orbitCenter),
        records.map((record) => record.orbitType),
      ],
    );

    await client.query(
      `
        WITH incoming AS (
          SELECT *
          FROM UNNEST(
            $1::integer[],
            $2::double precision[],
            $3::double precision[],
            $4::double precision[],
            $5::double precision[]
          ) AS incoming_values(
            norad_cat_id,
            inclination_degrees,
            orbital_period_minutes,
            apogee_km,
            perigee_km
          )
        ),
        latest AS (
          SELECT DISTINCT ON (satellites.id)
            orbit.id AS orbit_id,
            incoming.inclination_degrees,
            incoming.orbital_period_minutes,
            incoming.apogee_km,
            incoming.perigee_km
          FROM incoming
          JOIN satellites
            ON satellites.norad_cat_id = incoming.norad_cat_id
          JOIN satelite_orbit_data orbit
            ON orbit.satellite_id = satellites.id
          ORDER BY satellites.id, orbit.epoch DESC, orbit.calculated_at DESC
        )
        UPDATE satelite_orbit_data orbit
        SET
          inclination_degrees = COALESCE(latest.inclination_degrees, orbit.inclination_degrees),
          orbital_period_minutes = COALESCE(latest.orbital_period_minutes, orbit.orbital_period_minutes),
          apogee_km = COALESCE(latest.apogee_km, orbit.apogee_km),
          perigee_km = COALESCE(latest.perigee_km, orbit.perigee_km)
        FROM latest
        WHERE orbit.id = latest.orbit_id
      `,
      [
        records.map((record) => record.noradCatId),
        records.map((record) => record.inclinationDegrees),
        records.map((record) => record.orbitalPeriodMinutes),
        records.map((record) => record.apogeeKm),
        records.map((record) => record.perigeeKm),
      ],
    );

    await client.query("COMMIT");
    return result.rowCount ?? 0;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const upsertTleRecords = async (records: TleRecord[]): Promise<number> => {
  if (records.length === 0) return 0;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO satellites (norad_cat_id, satellite_name)
        SELECT *
        FROM UNNEST($1::integer[], $2::text[])
        ON CONFLICT (norad_cat_id) DO UPDATE SET
          satellite_name = EXCLUDED.satellite_name,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        records.map((record) => record.noradCatId),
        records.map((record) => record.satelliteName),
      ],
    );

    const result = await client.query(
      `
        INSERT INTO satelite_orbit_data (
          satellite_id,
          epoch,
          tle_line1,
          tle_line2,
          inclination_degrees,
          orbital_period_minutes,
          apogee_km,
          perigee_km,
          calculated_at
        )
        SELECT
          satellites.id,
          incoming.epoch,
          incoming.tle_line1,
          incoming.tle_line2,
          incoming.inclination_degrees,
          incoming.orbital_period_minutes,
          COALESCE(incoming.apogee_km, previous.apogee_km),
          COALESCE(incoming.perigee_km, previous.perigee_km),
          CURRENT_TIMESTAMP
        FROM UNNEST(
          $1::integer[],
          $2::timestamptz[],
          $3::text[],
          $4::text[],
          $5::double precision[],
          $6::double precision[],
          $7::double precision[],
          $8::double precision[]
        ) AS incoming(
          norad_cat_id,
          epoch,
          tle_line1,
          tle_line2,
          inclination_degrees,
          orbital_period_minutes,
          apogee_km,
          perigee_km
        )
        JOIN satellites
          ON satellites.norad_cat_id = incoming.norad_cat_id
        LEFT JOIN LATERAL (
          SELECT existing.apogee_km, existing.perigee_km
          FROM satelite_orbit_data existing
          WHERE existing.satellite_id = satellites.id
          ORDER BY existing.epoch DESC, existing.calculated_at DESC
          LIMIT 1
        ) previous ON true
        WHERE NOT EXISTS (
          SELECT 1
          FROM satelite_orbit_data existing
          WHERE existing.satellite_id = satellites.id
            AND existing.epoch = incoming.epoch
        )
      `,
      [
        records.map((record) => record.noradCatId),
        records.map((record) => record.epoch),
        records.map((record) => record.tleLine1),
        records.map((record) => record.tleLine2),
        records.map((record) => record.inclinationDegrees),
        records.map((record) => record.orbitalPeriodMinutes),
        records.map((record) => record.apogeeKm),
        records.map((record) => record.perigeeKm),
      ],
    );

    await client.query("COMMIT");
    return result.rowCount ?? 0;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getCelestrakCacheSummary = async (): Promise<CelestrakCacheSummary> => {
  const result = await db.query<{
    satellites: string;
    tle_records: string;
  }>(celestrakCacheSummaryQuery);

  return {
    satellites: Number(result.rows[0]?.satellites ?? 0),
    tleRecords: Number(result.rows[0]?.tle_records ?? 0),
  };
};

export const getStoredTleRecords = async (): Promise<StoredTleRecord[]> => {
  const result = await db.query<{
    norad_cat_id: number;
    satellite_name: string;
    epoch: Date;
    tle_line1: string;
    tle_line2: string;
  }>(storedTleRecordsQuery);

  return result.rows.map((row) => ({
    noradCatId: row.norad_cat_id,
    satelliteName: row.satellite_name,
    epoch: row.epoch.toISOString(),
    tleLine1: row.tle_line1,
    tleLine2: row.tle_line2,
  }));
};
