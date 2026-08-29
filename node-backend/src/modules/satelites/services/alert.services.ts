import {
  acknowledgeAlertById,
  findAlerts,
  insertAlert,
  insertAlertIfNotOpen,
  resolveAlertById,
} from "../repositories/alert.repository.ts";
import {
  AlertCollection,
  AlertCreateRequest,
  AlertDatabaseRow,
  AlertListQuery,
  AlertRecord,
} from "../types.ts";

export class AlertNotFoundError extends Error {
  constructor(public readonly alertId: string) {
    super(`Alert ${alertId} was not found`);
    this.name = "AlertNotFoundError";
  }
}

const toAlertRecord = (row: AlertDatabaseRow): AlertRecord => ({
  id: row.id,
  conjunction_event_id: row.conjunction_event_id,
  severity: row.severity,
  source: row.source,
  title: row.title,
  description: row.description,
  acknowledged: row.acknowledged_at !== null,
  resolved: row.resolved_at !== null,
  acknowledged_at: row.acknowledged_at?.toISOString() ?? null,
  resolved_at: row.resolved_at?.toISOString() ?? null,
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
});

export const createAlert = async (request: AlertCreateRequest): Promise<AlertRecord> => toAlertRecord(await insertAlert(request));

export const createAlertIfNotOpen = async (request: AlertCreateRequest): Promise<AlertRecord> => toAlertRecord(await insertAlertIfNotOpen(request));

export const getAlerts = async (query: AlertListQuery): Promise<AlertCollection> => {
  const data = await findAlerts(query);

  return {
    alerts: data.rows.map(toAlertRecord),
    counts: {
      all: Number(data.counts.all ?? 0),
      critical: Number(data.counts.critical ?? 0),
      high: Number(data.counts.high ?? 0),
      medium: Number(data.counts.medium ?? 0),
      low: Number(data.counts.low ?? 0),
      resolved: Number(data.counts.resolved ?? 0),
      unacknowledged: Number(data.counts.unacknowledged ?? 0),
    },
  };
};

export const acknowledgeAlert = async (alertId: string): Promise<AlertRecord> => {
  const row = await acknowledgeAlertById(alertId);
  if (!row) throw new AlertNotFoundError(alertId);
  return toAlertRecord(row);
};

export const resolveAlert = async (alertId: string): Promise<AlertRecord> => {
  const row = await resolveAlertById(alertId);
  if (!row) throw new AlertNotFoundError(alertId);
  return toAlertRecord(row);
};
