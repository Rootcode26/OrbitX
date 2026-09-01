import {
  findSatelliteHistory,
  findSatelliteSummary,
} from "../repositories/satellite-history.repository.ts";
import {
  SatelliteHistoryDatabaseRow,
  SatelliteHistoryPage,
  SatelliteHistoryRecord,
  SatelliteSummaryDatabaseRow,
} from "../types.ts";
import { SatelliteNotFoundError } from "./satellite-read.errors.ts";

const parseBstar = (tleLine1: string): number | null => {
  const value = tleLine1.slice(53, 61).replace(/\s/g, "");
  const match = value.match(/^([+-]?)(\d{5})([+-])(\d)$/);

  if (!match) return null;

  const [, mantissaSign, mantissaDigits, exponentSign, exponentDigits] = match;
  const mantissa = Number(`0.${mantissaDigits}`);
  const exponent = Number(`${exponentSign}${exponentDigits}`);

  if (!Number.isFinite(mantissa) || !Number.isFinite(exponent)) return null;

  return (mantissaSign === "-" ? -1 : 1) * mantissa * 10 ** exponent;
};

const toSatelliteSummary = (row: SatelliteSummaryDatabaseRow) => ({
  norad_cat_id: row.norad_cat_id,
  name: row.satellite_name,
  object_type: row.object_type,
  owner: row.owner,
  operational_status: row.operational_status,
});

const toHistoryRecord = (row: SatelliteHistoryDatabaseRow): SatelliteHistoryRecord => ({
  calculated_at: row.calculated_at.toISOString(),
  tle_epoch: row.tle_epoch.toISOString(),
  height_km: row.height_km,
  altitude_delta_km: row.altitude_delta_km,
  apogee_km: row.apogee_km,
  perigee_km: row.perigee_km,
  inclination_degrees: row.inclination_degrees,
  raan_degrees: row.raan_degrees,
  orbital_period_minutes: row.orbital_period_minutes,
  mean_motion_revolutions_per_day: 1_440 / row.orbital_period_minutes,
  bstar: parseBstar(row.tle_line1),
  revolution_number: row.revolution_number,
});

export const getSatelliteHistory = async (noradCatId: number, limit: number, before: string | undefined, clerkUserId: string | null): Promise<SatelliteHistoryPage> => {
  const [satellite, rows] = await Promise.all([
    findSatelliteSummary(noradCatId, clerkUserId),
    findSatelliteHistory(noradCatId, limit, before, clerkUserId),
  ]);

  if (!satellite) {
    throw new SatelliteNotFoundError(noradCatId);
  }

  const hasMore = rows.length > limit;
  const records = rows.slice(0, limit).map(toHistoryRecord);

  return {
    satellite: toSatelliteSummary(satellite),
    records,
    page: {
      limit,
      has_more: hasMore,
      next_cursor: hasMore
        ? records.at(-1)?.calculated_at ?? null
        : null,
    },
  };
};
