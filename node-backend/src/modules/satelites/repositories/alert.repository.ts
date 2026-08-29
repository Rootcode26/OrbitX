import { db } from "../../../db/index.ts";
import { CONJUNCTION_ALERT_MAX_SEPARATION_KM } from "../../../constants/index.ts";
import {
  AlertCreateRequest,
  AlertDatabaseRow,
  AlertListQuery,
} from "../types.ts";

const alertWithinSeparationThresholdSql = `(
  alerts.conjunction_event_id IS NULL
  OR EXISTS (
    SELECT 1 FROM conjunction_events ce
    WHERE ce.id = alerts.conjunction_event_id
      AND ce.minimum_separation_km IS NOT NULL
      AND ce.minimum_separation_km <= ${CONJUNCTION_ALERT_MAX_SEPARATION_KM}
  )
)`;

const alertPairJoinsSql = `
  LEFT JOIN conjunction_events alert_event ON alert_event.id = alerts.conjunction_event_id
  LEFT JOIN satellites alert_object_a ON alert_object_a.id = alert_event.object_a_id
  LEFT JOIN satellites alert_object_b ON alert_object_b.id = alert_event.object_b_id
`;
const alertPairKeySql = `CASE
  WHEN alerts.conjunction_event_id IS NULL THEN alerts.id::text
  ELSE 'pair:'
    || LEAST(alert_object_a.norad_cat_id, alert_object_b.norad_cat_id)::text
    || '-'
    || GREATEST(alert_object_a.norad_cat_id, alert_object_b.norad_cat_id)::text
END`;

const createAlertQuery = `
  INSERT INTO alerts (
    conjunction_event_id,
    severity,
    source,
    title,
    description
  )
  VALUES ($1, $2, $3, $4, $5)
  RETURNING *
`;

const alertCountsQuery = `
  WITH deduped AS (
    SELECT DISTINCT ON (${alertPairKeySql})
      alerts.severity,
      alerts.acknowledged_at,
      alerts.resolved_at
    FROM alerts
    ${alertPairJoinsSql}
    WHERE alerts.source = $1
      AND ${alertWithinSeparationThresholdSql}
    ORDER BY ${alertPairKeySql}, alerts.created_at DESC, alerts.id DESC
  )
  SELECT
    COUNT(*)::integer AS all,
    COUNT(*) FILTER (WHERE severity = 'CRITICAL')::integer AS critical,
    COUNT(*) FILTER (WHERE severity = 'HIGH')::integer AS high,
    COUNT(*) FILTER (WHERE severity = 'MEDIUM')::integer AS medium,
    COUNT(*) FILTER (WHERE severity = 'LOW')::integer AS low,
    COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)::integer AS resolved,
    COUNT(*) FILTER (WHERE acknowledged_at IS NULL)::integer AS unacknowledged
  FROM deduped
`;

const acknowledgeAlertQuery = `
  UPDATE alerts
  SET
    acknowledged_at = COALESCE(acknowledged_at, CURRENT_TIMESTAMP),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $1
  RETURNING *
`;

const resolveAlertQuery = `
  UPDATE alerts
  SET
    acknowledged_at = COALESCE(acknowledged_at, CURRENT_TIMESTAMP),
    resolved_at = COALESCE(resolved_at, CURRENT_TIMESTAMP),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $1
  RETURNING *
`;

const createAlertIfNotOpenQuery = `
  WITH existing AS (
    SELECT *
    FROM alerts
    WHERE source = $3
      AND title = $4
      AND resolved_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  ),
  inserted AS (
    INSERT INTO alerts (
      conjunction_event_id,
      severity,
      source,
      title,
      description
    )
    SELECT $1, $2, $3, $4, $5
    WHERE NOT EXISTS (SELECT 1 FROM existing)
    RETURNING *
  )
  SELECT * FROM inserted
  UNION ALL
  SELECT * FROM existing
  LIMIT 1
`;

export const insertAlert = async (request: AlertCreateRequest): Promise<AlertDatabaseRow> => {
  const result = await db.query<AlertDatabaseRow>(createAlertQuery, [
    request.conjunction_event_id ?? null,
    request.severity,
    request.source,
    request.title,
    request.description,
  ]);

  return result.rows[0];
};

export const insertAlertIfNotOpen = async (request: AlertCreateRequest): Promise<AlertDatabaseRow> => {
  const result = await db.query<AlertDatabaseRow>(createAlertIfNotOpenQuery, [
    request.conjunction_event_id ?? null,
    request.severity,
    request.source,
    request.title,
    request.description,
  ]);

  return result.rows[0];
};

export const findAlerts = async (query: AlertListQuery): Promise<{ rows: AlertDatabaseRow[]; counts: Record<string, number> }> => {
  const clauses: string[] = ["alerts.source = $1", alertWithinSeparationThresholdSql];
  const values: unknown[] = [query.source];
  const addClause = (sql: (parameter: string) => string, value?: unknown) => {
    if (value === undefined) {
      clauses.push(sql(""));
      return;
    }

    values.push(value);
    clauses.push(sql(`$${values.length}`));
  };

  if (query.severity) addClause((parameter) => `alerts.severity = ${parameter}`, query.severity);
  if (query.status === "unacknowledged") addClause(() => "alerts.acknowledged_at IS NULL");
  if (query.status === "acknowledged") addClause(() => "alerts.acknowledged_at IS NOT NULL AND alerts.resolved_at IS NULL");
  if (query.status === "resolved") addClause(() => "alerts.resolved_at IS NOT NULL");

  values.push(query.limit);
  const limitParameter = `$${values.length}`;
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const listAlertsQuery = `
    WITH deduped AS (
      SELECT DISTINCT ON (${alertPairKeySql}) alerts.*
      FROM alerts
      ${alertPairJoinsSql}
      ${where}
      ORDER BY ${alertPairKeySql}, alerts.created_at DESC, alerts.id DESC
    )
    SELECT * FROM deduped
    ORDER BY created_at DESC, id DESC
    LIMIT ${limitParameter}
  `;
  const [alertsResult, countsResult] = await Promise.all([
    db.query<AlertDatabaseRow>(listAlertsQuery, values),
    db.query<Record<string, number>>(alertCountsQuery, [query.source]),
  ]);

  return {
    rows: alertsResult.rows,
    counts: countsResult.rows[0],
  };
};

export const acknowledgeAlertById = async (alertId: string): Promise<AlertDatabaseRow | null> => {
  const result = await db.query<AlertDatabaseRow>(acknowledgeAlertQuery, [alertId]);
  return result.rows[0] ?? null;
};

export const resolveAlertById = async (alertId: string): Promise<AlertDatabaseRow | null> => {
  const result = await db.query<AlertDatabaseRow>(resolveAlertQuery, [alertId]);
  return result.rows[0] ?? null;
};
