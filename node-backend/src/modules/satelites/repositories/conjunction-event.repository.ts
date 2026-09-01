import { db } from "../../../db/index.ts";
import { CONJUNCTION_ALERT_MAX_SEPARATION_KM } from "../../../constants/index.ts";
import {
  AlertSeverity,
  ConjunctionDailyMetric,
  ConjunctionDistributionMetric,
  ConjunctionEventDatabaseRow,
  ConjunctionEventListQuery,
  ConjunctionEventWrite,
  ConjunctionRiskMetric,
} from "../types.ts";

const beginTransactionQuery = "BEGIN";
const commitTransactionQuery = "COMMIT";
const rollbackTransactionQuery = "ROLLBACK";

const conjunctionEventEligibilitySql = (alias: string): string => `(
  ${alias}.minimum_separation_km IS NOT NULL
  AND ${alias}.minimum_separation_km <= ${CONJUNCTION_ALERT_MAX_SEPARATION_KM}
)`;

const latestConjunctionEventIdsSql = `
  SELECT DISTINCT ON (
    LEAST(pair_a.norad_cat_id, pair_b.norad_cat_id),
    GREATEST(pair_a.norad_cat_id, pair_b.norad_cat_id)
  ) pair_event.id
  FROM conjunction_events pair_event
  JOIN satellites pair_a ON pair_a.id = pair_event.object_a_id
  JOIN satellites pair_b ON pair_b.id = pair_event.object_b_id
  WHERE ${conjunctionEventEligibilitySql("pair_event")}
  ORDER BY
    LEAST(pair_a.norad_cat_id, pair_b.norad_cat_id),
    GREATEST(pair_a.norad_cat_id, pair_b.norad_cat_id),
    pair_event.computed_at DESC,
    pair_event.id DESC
`;

const effectiveTcaSql = "COALESCE(event.tca, NULLIF(event.raw_result->>'closest_approach_time_utc', '')::timestamptz)";
const effectiveRiskLevelSql = `CASE
  WHEN event.risk_level = 'CLEAR' AND event.minimum_separation_km IS NOT NULL AND event.minimum_separation_km < 1 THEN 'CRITICAL'
  WHEN event.risk_level = 'CLEAR' AND event.minimum_separation_km IS NOT NULL AND event.minimum_separation_km < 5 THEN 'HIGH'
  WHEN event.risk_level = 'CLEAR' AND event.minimum_separation_km IS NOT NULL AND event.minimum_separation_km < 10 THEN 'MEDIUM'
  WHEN event.risk_level = 'CLEAR' AND event.minimum_separation_km IS NOT NULL AND event.minimum_separation_km <= ${CONJUNCTION_ALERT_MAX_SEPARATION_KM} THEN 'LOW'
  ELSE event.risk_level
END`;

const conjunctionEventSelect = (includeRawResult = true, includeSeparationProfile = true) => `
  event.id,
  object_a.norad_cat_id AS object_a_norad_id,
  object_a.satellite_name AS object_a_name,
  object_b.norad_cat_id AS object_b_norad_id,
  object_b.satellite_name AS object_b_name,
  event.screening_started_at,
  event.screening_duration_minutes,
  event.screening_step_seconds,
  event.computed_at,
  ${effectiveTcaSql} AS tca,
  event.minimum_separation_km,
  event.relative_velocity_km_s,
  event.collision_probability,
  event.risk_score,
  ${effectiveRiskLevelSql} AS risk_level,
  event.encounter_angle_degrees,
  event.radial_uncertainty_m,
  ${includeSeparationProfile ? "COALESCE(event.separation_profile, event.raw_result->'separation_samples')" : "NULL::jsonb"} AS separation_profile,
  ${includeRawResult ? "event.raw_result" : "'{}'::jsonb"} AS raw_result,
  event.created_at
`;

const insertConjunctionEventQuery = `
  WITH objects AS (
    SELECT
      (SELECT id FROM satellites WHERE norad_cat_id = $1) AS object_a_id,
      (SELECT id FROM satellites WHERE norad_cat_id = $2) AS object_b_id
  )
  INSERT INTO conjunction_events (
    object_a_id,
    object_b_id,
    screening_started_at,
    screening_duration_minutes,
    screening_step_seconds,
    computed_at,
    tca,
    minimum_separation_km,
    relative_velocity_km_s,
    collision_probability,
    risk_score,
    risk_level,
    encounter_angle_degrees,
    radial_uncertainty_m,
    separation_profile,
    raw_result
  )
  SELECT
    objects.object_a_id,
    objects.object_b_id,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9,
    $10,
    $11,
    $12,
    $13,
    $14,
    $15::jsonb,
    $16::jsonb
  FROM objects
  WHERE objects.object_a_id IS NOT NULL
    AND objects.object_b_id IS NOT NULL
  RETURNING id
`;

const existingConjunctionEventForPairQuery = `
  SELECT event.id
  FROM conjunction_events event
  JOIN satellites object_a ON object_a.id = event.object_a_id
  JOIN satellites object_b ON object_b.id = event.object_b_id
  WHERE LEAST(object_a.norad_cat_id, object_b.norad_cat_id) = LEAST($1::integer, $2::integer)
    AND GREATEST(object_a.norad_cat_id, object_b.norad_cat_id) = GREATEST($1::integer, $2::integer)
  ORDER BY event.computed_at DESC, event.id DESC
  LIMIT 1
  FOR UPDATE OF event
`;

const updateConjunctionEventQuery = `
  UPDATE conjunction_events
  SET
    screening_started_at = $2,
    screening_duration_minutes = $3,
    screening_step_seconds = $4,
    computed_at = $5,
    tca = $6,
    minimum_separation_km = $7,
    relative_velocity_km_s = $8,
    collision_probability = $9,
    risk_score = $10,
    risk_level = $11,
    encounter_angle_degrees = $12,
    radial_uncertainty_m = $13,
    separation_profile = $14::jsonb,
    raw_result = $15::jsonb
  WHERE id = $1
  RETURNING id
`;

const insertConjunctionAlertQuery = `
  INSERT INTO alerts (
    conjunction_event_id,
    severity,
    source,
    title,
    description
  )
  VALUES ($1, $2, 'CONJUNCTION_SCREENING', $3, $4)
  ON CONFLICT (conjunction_event_id) DO NOTHING
`;

const lockConjunctionAlertPairQuery = `
  SELECT pg_advisory_xact_lock(LEAST($1::integer, $2::integer), GREATEST($1::integer, $2::integer))
`;

const matchingOpenConjunctionAlertQuery = `
  SELECT alert.id
  FROM alerts alert
  JOIN conjunction_events existing_event
    ON existing_event.id = alert.conjunction_event_id
  JOIN satellites existing_object_a
    ON existing_object_a.id = existing_event.object_a_id
  JOIN satellites existing_object_b
    ON existing_object_b.id = existing_event.object_b_id
  WHERE alert.source = 'CONJUNCTION_SCREENING'
    AND alert.resolved_at IS NULL
    AND LEAST(existing_object_a.norad_cat_id, existing_object_b.norad_cat_id) = LEAST($1::integer, $2::integer)
    AND GREATEST(existing_object_a.norad_cat_id, existing_object_b.norad_cat_id) = GREATEST($1::integer, $2::integer)
  ORDER BY alert.updated_at DESC, alert.id DESC
  LIMIT 1
  FOR UPDATE OF alert
`;

const refreshConjunctionAlertQuery = `
  UPDATE alerts
  SET
    conjunction_event_id = $2,
    severity = $3,
    title = $4,
    description = $5,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $1
`;

const conjunctionEventByIdQuery = `
  SELECT ${conjunctionEventSelect()}
  FROM conjunction_events event
  JOIN satellites object_a ON object_a.id = event.object_a_id
  JOIN satellites object_b ON object_b.id = event.object_b_id
  WHERE event.id = $1
`;

const dailyConjunctionMetricsQuery = `
  WITH days AS (
    SELECT generate_series(
      DATE_TRUNC('day', CURRENT_TIMESTAMP) - (($1::integer - 1) * INTERVAL '1 day'),
      DATE_TRUNC('day', CURRENT_TIMESTAMP),
      INTERVAL '1 day'
    ) AS day
  ),
  normalized AS (
    SELECT
      computed_at,
      CASE
        WHEN risk_level = 'CLEAR' AND minimum_separation_km < 1 THEN 'CRITICAL'
        WHEN risk_level = 'CLEAR' AND minimum_separation_km < 5 THEN 'HIGH'
        WHEN risk_level = 'CLEAR' AND minimum_separation_km < 10 THEN 'MEDIUM'
        WHEN risk_level = 'CLEAR' AND minimum_separation_km <= ${CONJUNCTION_ALERT_MAX_SEPARATION_KM} THEN 'LOW'
        ELSE risk_level
      END AS risk_level
    FROM conjunction_events
    WHERE computed_at >= CURRENT_TIMESTAMP - ($1::text || ' days')::interval
      AND id IN (${latestConjunctionEventIdsSql})
  )
  SELECT
    TO_CHAR(days.day, 'YYYY-MM-DD') AS date,
    COUNT(normalized.computed_at) FILTER (WHERE normalized.risk_level = 'CRITICAL')::integer AS critical,
    COUNT(normalized.computed_at) FILTER (WHERE normalized.risk_level = 'HIGH')::integer AS high,
    COUNT(normalized.computed_at) FILTER (WHERE normalized.risk_level = 'MEDIUM')::integer AS medium,
    COUNT(normalized.computed_at) FILTER (WHERE normalized.risk_level = 'LOW')::integer AS low,
    COUNT(normalized.computed_at) FILTER (WHERE normalized.risk_level = 'CLEAR')::integer AS clear,
    COUNT(normalized.computed_at)::integer AS total
  FROM days
  LEFT JOIN normalized ON DATE_TRUNC('day', normalized.computed_at) = days.day
  GROUP BY days.day
  ORDER BY days.day
`;

const missDistanceDistributionQuery = `
  SELECT bucket AS label, COUNT(*)::integer AS count
  FROM (
    SELECT CASE
      WHEN minimum_separation_km IS NULL THEN 'unknown'
      WHEN minimum_separation_km < 1 THEN '< 1 km'
      WHEN minimum_separation_km < 10 THEN '1 - 10 km'
      WHEN minimum_separation_km < 50 THEN '10 - 50 km'
      WHEN minimum_separation_km < 100 THEN '50 - 100 km'
      WHEN minimum_separation_km < 250 THEN '100 - 250 km'
      ELSE '250 - 500 km'
    END AS bucket
    FROM conjunction_events
    WHERE computed_at >= CURRENT_TIMESTAMP - ($1::text || ' days')::interval
      AND id IN (${latestConjunctionEventIdsSql})
  ) distribution
  GROUP BY bucket
  ORDER BY CASE bucket
    WHEN '< 1 km' THEN 1
    WHEN '1 - 10 km' THEN 2
    WHEN '10 - 50 km' THEN 3
    WHEN '50 - 100 km' THEN 4
    WHEN '100 - 250 km' THEN 5
    WHEN '250 - 500 km' THEN 6
    ELSE 7
  END
`;

const riskDistributionQuery = `
  WITH distribution AS (
    SELECT
      CASE
        WHEN risk_level = 'CLEAR' AND minimum_separation_km < 1 THEN 'CRITICAL'
        WHEN risk_level = 'CLEAR' AND minimum_separation_km < 5 THEN 'HIGH'
        WHEN risk_level = 'CLEAR' AND minimum_separation_km < 10 THEN 'MEDIUM'
        WHEN risk_level = 'CLEAR' AND minimum_separation_km <= ${CONJUNCTION_ALERT_MAX_SEPARATION_KM} THEN 'LOW'
        ELSE risk_level
      END AS risk_level,
      COUNT(*)::integer AS count
    FROM conjunction_events
    WHERE computed_at >= CURRENT_TIMESTAMP - ($1::text || ' days')::interval
      AND id IN (${latestConjunctionEventIdsSql})
    GROUP BY CASE
      WHEN risk_level = 'CLEAR' AND minimum_separation_km < 1 THEN 'CRITICAL'
      WHEN risk_level = 'CLEAR' AND minimum_separation_km < 5 THEN 'HIGH'
      WHEN risk_level = 'CLEAR' AND minimum_separation_km < 10 THEN 'MEDIUM'
      WHEN risk_level = 'CLEAR' AND minimum_separation_km <= ${CONJUNCTION_ALERT_MAX_SEPARATION_KM} THEN 'LOW'
      ELSE risk_level
    END
  ),
  total AS (
    SELECT COALESCE(SUM(count), 0)::integer AS count FROM distribution
  )
  SELECT
    distribution.risk_level,
    distribution.count,
    CASE
      WHEN total.count = 0 THEN 0
      ELSE ROUND(distribution.count * 100.0 / total.count, 1)::double precision
    END AS percentage
  FROM distribution
  CROSS JOIN total
  ORDER BY CASE distribution.risk_level
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    WHEN 'LOW' THEN 4
    ELSE 5
  END
`;

const upcomingConjunctionEventsQuery = `
  SELECT ${conjunctionEventSelect(false, false)}
  FROM conjunction_events event
  JOIN satellites object_a ON object_a.id = event.object_a_id
  JOIN satellites object_b ON object_b.id = event.object_b_id
  WHERE event.id IN (${latestConjunctionEventIdsSql})
    AND ${effectiveTcaSql} >= CURRENT_TIMESTAMP
    AND ${effectiveTcaSql} < CURRENT_TIMESTAMP + INTERVAL '7 days'
  ORDER BY ${effectiveTcaSql} ASC
  LIMIT 100
`;

export const insertConjunctionEvent = async (event: ConjunctionEventWrite, alert: { title: string; description: string } | null): Promise<string> => {
  const client = await db.connect();

  try {
    await client.query(beginTransactionQuery);
    await client.query(lockConjunctionAlertPairQuery, [event.object_a_norad_id, event.object_b_norad_id]);
    const existing = await client.query<{ id: string }>(existingConjunctionEventForPairQuery, [
      event.object_a_norad_id,
      event.object_b_norad_id,
    ]);
    const values = [
      event.object_a_norad_id,
      event.object_b_norad_id,
      event.screening_started_at,
      event.screening_duration_minutes,
      event.screening_step_seconds,
      event.computed_at,
      event.tca,
      event.minimum_separation_km,
      event.relative_velocity_km_s,
      event.collision_probability,
      event.risk_score,
      event.risk_level,
      event.encounter_angle_degrees,
      event.radial_uncertainty_m,
      event.separation_profile ? JSON.stringify(event.separation_profile) : null,
      JSON.stringify(event.raw_result),
    ];
    const existingEventId = existing.rows[0]?.id;
    const result = existingEventId
      ? await client.query<{ id: string }>(updateConjunctionEventQuery, [existingEventId, ...values.slice(2)])
      : await client.query<{ id: string }>(insertConjunctionEventQuery, values);
    const eventId = result.rows[0]?.id;

    if (!eventId) {
      throw new Error("Conjunction event could not resolve both satellite records");
    }

    if (alert && event.risk_level !== "CLEAR") {
      const matchingAlert = await client.query<{ id: string }>(matchingOpenConjunctionAlertQuery, [
        event.object_a_norad_id,
        event.object_b_norad_id,
      ]);
      const existingAlertId = matchingAlert.rows[0]?.id;

      if (existingAlertId) {
        await client.query(refreshConjunctionAlertQuery, [
          existingAlertId,
          eventId,
          event.risk_level as AlertSeverity,
          alert.title,
          alert.description,
        ]);
      } else {
        await client.query(insertConjunctionAlertQuery, [
          eventId,
          event.risk_level as AlertSeverity,
          alert.title,
          alert.description,
        ]);
      }
    }

    await client.query(commitTransactionQuery);
    return eventId;
  } catch (error) {
    await client.query(rollbackTransactionQuery);
    throw error;
  } finally {
    client.release();
  }
};

export const findConjunctionEvents = async (query: ConjunctionEventListQuery): Promise<ConjunctionEventDatabaseRow[]> => {
  const clauses: string[] = [`event.id IN (${latestConjunctionEventIdsSql})`];
  const values: unknown[] = [];
  const addClause = (sql: (parameter: string) => string, value: unknown) => {
    values.push(value);
    clauses.push(sql(`$${values.length}`));
  };

  if (query.risk_level) addClause((parameter) => `${effectiveRiskLevelSql} = ${parameter}`, query.risk_level);
  if (query.from) addClause((parameter) => `event.computed_at >= ${parameter}::timestamptz`, query.from);
  if (query.to) addClause((parameter) => `event.computed_at <= ${parameter}::timestamptz`, query.to);
  if (query.before) addClause((parameter) => `event.computed_at < ${parameter}::timestamptz`, query.before);
  if (query.tca_window_hours) {
    values.push(query.tca_window_hours);
    const windowParameter = `$${values.length}`;
    clauses.push(`${effectiveTcaSql} >= CURRENT_TIMESTAMP - (${windowParameter}::text || ' hours')::interval`);
    clauses.push(`${effectiveTcaSql} < CURRENT_TIMESTAMP + (${windowParameter}::text || ' hours')::interval`);
  }
  if (query.upcoming) {
    values.push(query.horizon_hours);
    const horizonParameter = `$${values.length}`;
    clauses.push(`${effectiveTcaSql} >= CURRENT_TIMESTAMP`);
    clauses.push(`${effectiveTcaSql} < CURRENT_TIMESTAMP + (${horizonParameter}::text || ' hours')::interval`);
  }

  values.push(query.limit + 1);
  const limitParameter = `$${values.length}`;
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const listConjunctionEventsQuery = `
    SELECT ${conjunctionEventSelect(false, false)}
    FROM conjunction_events event
    JOIN satellites object_a ON object_a.id = event.object_a_id
    JOIN satellites object_b ON object_b.id = event.object_b_id
    ${where}
    ORDER BY event.computed_at DESC, event.id DESC
    LIMIT ${limitParameter}
  `;
  const result = await db.query<ConjunctionEventDatabaseRow>(listConjunctionEventsQuery, values);

  return result.rows;
};

export const findConjunctionEventById = async (eventId: string): Promise<ConjunctionEventDatabaseRow | null> => {
  const result = await db.query<ConjunctionEventDatabaseRow>(conjunctionEventByIdQuery, [eventId]);

  return result.rows[0] ?? null;
};

export const findConjunctionAnalytics = async (windowDays: number) => {
  const [dailyResult, missDistanceResult, riskResult, upcomingResult] = await Promise.all([
    db.query<ConjunctionDailyMetric>(dailyConjunctionMetricsQuery, [windowDays]),
    db.query<ConjunctionDistributionMetric>(missDistanceDistributionQuery, [windowDays]),
    db.query<ConjunctionRiskMetric>(riskDistributionQuery, [windowDays]),
    db.query<ConjunctionEventDatabaseRow>(upcomingConjunctionEventsQuery),
  ]);
  const totalEvents = dailyResult.rows.reduce((total, row) => total + row.total, 0);

  return {
    totalEvents,
    daily: dailyResult.rows,
    missDistances: missDistanceResult.rows,
    risks: riskResult.rows,
    upcoming: upcomingResult.rows,
  };
};
