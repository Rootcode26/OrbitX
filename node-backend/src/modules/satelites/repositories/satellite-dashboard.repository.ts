import { db } from "../../../db/index.ts";
import { CONJUNCTION_ALERT_MAX_SEPARATION_KM } from "../../../constants/index.ts";
import {
  AltitudeDensityMetric,
  AnalyticsTotalsDatabaseRow,
  ClassificationDatabaseRow,
  DataSourceDatabaseRow,
  NamedCountMetric,
  OverviewDatabaseRow,
} from "../types.ts";

const activeStatuses = ["+", "P", "B", "S", "X"];

const latestConjunctionEventIdsSql = `
  SELECT DISTINCT ON (
    LEAST(pair_a.norad_cat_id, pair_b.norad_cat_id),
    GREATEST(pair_a.norad_cat_id, pair_b.norad_cat_id)
  ) pair_event.id
  FROM conjunction_events pair_event
  JOIN satellites pair_a ON pair_a.id = pair_event.object_a_id
  JOIN satellites pair_b ON pair_b.id = pair_event.object_b_id
  WHERE pair_event.minimum_separation_km IS NOT NULL
    AND pair_event.minimum_separation_km <= ${CONJUNCTION_ALERT_MAX_SEPARATION_KM}
  ORDER BY
    LEAST(pair_a.norad_cat_id, pair_b.norad_cat_id),
    GREATEST(pair_a.norad_cat_id, pair_b.norad_cat_id),
    pair_event.computed_at DESC,
    pair_event.id DESC
`;

const overviewSummaryQuery = `
  SELECT
    COUNT(*)::text AS tracked_objects,
    COUNT(*) FILTER (
      WHERE object_type = 'PAY'
        AND operational_status = ANY($1::text[])
    )::text AS active_payloads,
    COUNT(*) FILTER (
      WHERE object_type = 'PAY'
        AND NOT (operational_status = ANY($1::text[]))
    )::text AS inactive_payloads,
    COUNT(*) FILTER (WHERE object_type = 'DEB')::text AS debris,
    COUNT(*) FILTER (WHERE object_type = 'R/B')::text AS rocket_bodies,
    (
      SELECT COUNT(DISTINCT satellite_id)::text
      FROM satelite_orbit_data
      WHERE position_x_km IS NOT NULL
    ) AS propagated_objects,
    MAX(updated_at) AS latest_catalog_update,
    (SELECT MAX(epoch) FROM satelite_orbit_data) AS latest_tle_epoch,
    (
      SELECT MAX(calculated_at)
      FROM satelite_orbit_data
      WHERE position_x_km IS NOT NULL
    ) AS latest_propagation,
    (
      SELECT COUNT(*)::text
      FROM conjunction_events
      WHERE COALESCE(tca, NULLIF(raw_result->>'closest_approach_time_utc', '')::timestamptz) >= CURRENT_TIMESTAMP
        AND COALESCE(tca, NULLIF(raw_result->>'closest_approach_time_utc', '')::timestamptz) < CURRENT_TIMESTAMP + INTERVAL '7 days'
        AND id IN (${latestConjunctionEventIdsSql})
    ) AS upcoming_conjunctions,
    (
      SELECT COUNT(*)::text
      FROM conjunction_events
      WHERE COALESCE(tca, NULLIF(raw_result->>'closest_approach_time_utc', '')::timestamptz) >= CURRENT_TIMESTAMP
        AND COALESCE(tca, NULLIF(raw_result->>'closest_approach_time_utc', '')::timestamptz) < CURRENT_TIMESTAMP + INTERVAL '7 days'
        AND (risk_level IN ('CRITICAL', 'HIGH') OR risk_score >= 60)
        AND id IN (${latestConjunctionEventIdsSql})
    ) AS high_risk_conjunctions,
    (
      SELECT COUNT(*)::text FROM (
        SELECT DISTINCT ON (
          LEAST(alert_a.norad_cat_id, alert_b.norad_cat_id),
          GREATEST(alert_a.norad_cat_id, alert_b.norad_cat_id)
        ) al.acknowledged_at
        FROM alerts al
        JOIN conjunction_events ce ON ce.id = al.conjunction_event_id
        JOIN satellites alert_a ON alert_a.id = ce.object_a_id
        JOIN satellites alert_b ON alert_b.id = ce.object_b_id
        WHERE al.source = 'CONJUNCTION_SCREENING'
          AND ce.minimum_separation_km IS NOT NULL
          AND ce.minimum_separation_km <= ${CONJUNCTION_ALERT_MAX_SEPARATION_KM}
        ORDER BY
          LEAST(alert_a.norad_cat_id, alert_b.norad_cat_id),
          GREATEST(alert_a.norad_cat_id, alert_b.norad_cat_id),
          al.created_at DESC, al.id DESC
      ) latest_alert
      WHERE latest_alert.acknowledged_at IS NULL
    ) AS unacknowledged_alerts
  FROM satellites
`;

const classificationQuery = `
  SELECT
    COUNT(*) FILTER (
      WHERE object_type = 'PAY'
        AND operational_status = ANY($1::text[])
    )::integer AS active_payloads,
    COUNT(*) FILTER (
      WHERE object_type = 'PAY'
        AND NOT (operational_status = ANY($1::text[]))
    )::integer AS inactive_payloads,
    COUNT(*) FILTER (WHERE object_type = 'R/B')::integer AS rocket_bodies,
    COUNT(*) FILTER (WHERE object_type = 'DEB')::integer AS debris,
    COUNT(*) FILTER (
      WHERE object_type IS NULL OR object_type = 'UNK'
    )::integer AS unknown
  FROM satellites
`;

const altitudeDensityQuery = `
  WITH latest_orbits AS (
    SELECT DISTINCT ON (satellite_id)
      satellite_id,
      COALESCE(height_km, (apogee_km + perigee_km) / 2.0) AS altitude_km
    FROM satelite_orbit_data
    WHERE height_km IS NOT NULL
      OR (apogee_km IS NOT NULL AND perigee_km IS NOT NULL)
    ORDER BY satellite_id, epoch DESC, calculated_at DESC
  ),
  buckets AS (
    SELECT generate_series(300, 1400, 100) AS minimum_km
  )
  SELECT
    buckets.minimum_km,
    buckets.minimum_km + 100 AS maximum_km,
    COUNT(latest_orbits.satellite_id)::integer AS count
  FROM buckets
  LEFT JOIN latest_orbits
    ON latest_orbits.altitude_km >= buckets.minimum_km
    AND latest_orbits.altitude_km < buckets.minimum_km + 100
  GROUP BY buckets.minimum_km
  ORDER BY buckets.minimum_km
`;

const topOwnersQuery = `
  SELECT owner AS name, COUNT(*)::integer AS count
  FROM satellites
  WHERE owner IS NOT NULL AND TRIM(owner) <> ''
  GROUP BY owner
  ORDER BY count DESC, owner ASC
  LIMIT 10
`;

const operationalStatusesQuery = `
  SELECT
    CASE
      WHEN operational_status = ANY($1::text[]) THEN 'active'
      WHEN operational_status IS NULL OR operational_status = '?' THEN 'unknown'
      ELSE 'inactive'
    END AS name,
    COUNT(*)::integer AS count
  FROM satellites
  GROUP BY name
  ORDER BY name
`;

const analyticsTotalsQuery = `
  SELECT
    (SELECT COUNT(*) FROM satellites)::integer AS total_objects,
    (
      SELECT COUNT(DISTINCT satellite_id)
      FROM satelite_orbit_data
    )::integer AS objects_with_orbit_data
`;

const dataSourceSummaryQuery = `
  SELECT
    (SELECT COUNT(*) FROM satellites)::text AS satcat_records,
    (
      SELECT COUNT(DISTINCT satellite_id)
      FROM satelite_orbit_data
      WHERE tle_line1 IS NOT NULL AND tle_line2 IS NOT NULL
    )::text AS tle_records,
    (
      SELECT COUNT(DISTINCT satellite_id)
      FROM satelite_orbit_data
      WHERE position_x_km IS NOT NULL
        AND velocity_x_km_s IS NOT NULL
    )::text AS propagation_records,
    (
      SELECT COUNT(DISTINCT satellite_id)
      FROM satelite_orbit_data
      WHERE height_km IS NOT NULL
        AND speed_km_s IS NOT NULL
    )::text AS current_state_records,
    (SELECT COUNT(*) FROM conjunction_events)::text AS conjunction_records,
    (SELECT MAX(updated_at) FROM satellites) AS latest_catalog_update,
    (
      SELECT MAX(created_at)
      FROM satelite_orbit_data
      WHERE position_x_km IS NULL
    ) AS latest_tle_update,
    (
      SELECT MAX(calculated_at)
      FROM satelite_orbit_data
      WHERE position_x_km IS NOT NULL
    ) AS latest_propagation,
    (
      SELECT MAX(calculated_at)
      FROM satelite_orbit_data
      WHERE height_km IS NOT NULL
        AND speed_km_s IS NOT NULL
    ) AS latest_current_state,
    (SELECT MAX(computed_at) FROM conjunction_events) AS latest_conjunction
`;

export const findOverviewSummary = async (): Promise<OverviewDatabaseRow> => {
  const result = await db.query<OverviewDatabaseRow>(overviewSummaryQuery, [activeStatuses]);

  return result.rows[0];
};

export const findSatelliteAnalytics = async () => {
  const [classificationResult, altitudeResult, ownerResult, statusResult, totalsResult] = await Promise.all([
    db.query<ClassificationDatabaseRow>(classificationQuery, [activeStatuses]),
    db.query<AltitudeDensityMetric>(altitudeDensityQuery),
    db.query<NamedCountMetric>(topOwnersQuery),
    db.query<NamedCountMetric>(operationalStatusesQuery, [activeStatuses]),
    db.query<AnalyticsTotalsDatabaseRow>(analyticsTotalsQuery),
  ]);

  return {
    classification: classificationResult.rows[0],
    altitudeDensity: altitudeResult.rows,
    owners: ownerResult.rows,
    statuses: statusResult.rows,
    totals: totalsResult.rows[0],
  };
};

export const findDataSourceSummary = async (): Promise<DataSourceDatabaseRow> => {
  const result = await db.query<DataSourceDatabaseRow>(dataSourceSummaryQuery);

  return result.rows[0];
};
