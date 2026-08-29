import { env } from "../../../config/env.ts";
import {
  findDataSourceSummary,
  findOverviewSummary,
  findSatelliteAnalytics,
} from "../repositories/satellite-dashboard.repository.ts";
import {
  DataSourceStatus,
  OverviewSummary,
  SatelliteAnalytics,
} from "../types.ts";
import { getCelestrakSyncStatus } from "./celestrak-sync-status.services.ts";
import { getConjunctionAnalytics } from "./conjunction-event.services.ts";

const toIsoDate = (value: Date | null): string | null => (
  value ? value.toISOString() : null
);

const storedResultStatus = (records: number): DataSourceStatus["status"] => records > 0 ? "available" : "empty";

export const getOverviewSummary = async (): Promise<OverviewSummary> => {
  const row = await findOverviewSummary();

  return {
    tracked_objects: Number(row.tracked_objects),
    active_payloads: Number(row.active_payloads),
    inactive_payloads: Number(row.inactive_payloads),
    debris: Number(row.debris),
    rocket_bodies: Number(row.rocket_bodies),
    propagated_objects: Number(row.propagated_objects),
    latest_catalog_update: toIsoDate(row.latest_catalog_update),
    latest_tle_epoch: toIsoDate(row.latest_tle_epoch),
    latest_propagation: toIsoDate(row.latest_propagation),
    upcoming_conjunctions: Number(row.upcoming_conjunctions),
    high_risk_conjunctions: Number(row.high_risk_conjunctions),
    unacknowledged_alerts: Number(row.unacknowledged_alerts),
  };
};

export const getSatelliteAnalytics = async (): Promise<SatelliteAnalytics> => {
  const [result, conjunctions] = await Promise.all([
    findSatelliteAnalytics(),
    getConjunctionAnalytics(14),
  ]);
  const classification = result.classification;

  return {
    total_objects: result.totals.total_objects,
    objects_with_orbit_data: result.totals.objects_with_orbit_data,
    classifications: [
      { category: "active_payloads", count: classification.active_payloads },
      { category: "inactive_payloads", count: classification.inactive_payloads },
      { category: "rocket_bodies", count: classification.rocket_bodies },
      { category: "debris", count: classification.debris },
      { category: "unknown", count: classification.unknown },
    ],
    altitude_density: result.altitudeDensity,
    top_owners: result.owners,
    operational_statuses: result.statuses,
    conjunctions,
  };
};

export const getDataSourceStatuses = async (): Promise<DataSourceStatus[]> => {
  const database = await findDataSourceSummary();
  const runtime = getCelestrakSyncStatus();
  const completedAt = runtime?.completedAt ?? null;

  return [
    {
      id: "tle",
      name: "CelesTrak TLE data",
      status: runtime?.summary.tle.state
        ?? (Number(database.tle_records) > 0 ? "available" : "empty"),
      records: Number(database.tle_records),
      last_sync_utc: completedAt ?? toIsoDate(database.latest_tle_update),
      cadence: env.CELESTRAK_SYNC_CRON,
      endpoint: `${env.CELESTRAK_TLE_URL.split("?")[0]} · ${env.CELESTRAK_GROUPS.length} groups`,
      ...(runtime?.summary.tle.error
        ? { error: runtime.summary.tle.error }
        : {}),
    },
    {
      id: "satcat",
      name: "CelesTrak SATCAT",
      status: runtime?.summary.satcat.state
        ?? (Number(database.satcat_records) > 0 ? "available" : "empty"),
      records: Number(database.satcat_records),
      last_sync_utc: completedAt ?? toIsoDate(database.latest_catalog_update),
      cadence: env.CELESTRAK_SYNC_CRON,
      endpoint: `${env.CELESTRAK_SATCAT_URL.split("?")[0]} · ${env.CELESTRAK_GROUPS.length} groups`,
      ...(runtime?.summary.satcat.error
        ? { error: runtime.summary.satcat.error }
        : {}),
    },
    {
      id: "propagation",
      name: "SGP4 propagation API",
      status: storedResultStatus(Number(database.propagation_records)),
      records: Number(database.propagation_records),
      last_sync_utc: toIsoDate(database.latest_propagation),
      cadence: env.SGP4_PROPAGATION_CRON,
      endpoint: env.PROPAGATION_URL,
    },
    {
      id: "current_state",
      name: "Current satellite state API",
      status: storedResultStatus(Number(database.current_state_records)),
      records: Number(database.current_state_records),
      last_sync_utc: toIsoDate(database.latest_current_state),
      cadence: env.SGP4_PROPAGATION_CRON,
      endpoint: env.SATELLITE_CURRENT_STATE_URL,
    },
    {
      id: "conjunction",
      name: "Conjunction checking API",
      status: storedResultStatus(Number(database.conjunction_records)),
      records: Number(database.conjunction_records),
      last_sync_utc: toIsoDate(database.latest_conjunction),
      cadence: "on demand",
      endpoint: env.CONJUNCTION_CHECK_URL,
    },
  ];
};
