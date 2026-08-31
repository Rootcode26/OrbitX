import {
  findNearbySatelliteStates,
  findLatestSatelliteState,
  findLatestSatelliteStates,
} from "../repositories/satellite-state.repository.ts";
import {
  NearbySatellitePage,
  SatelliteCurrentState,
  SatelliteStateCollection,
  SatelliteStateDatabaseRow,
} from "../types.ts";
import { SatelliteStateNotFoundError } from "./satellite-read.errors.ts";

const toSatelliteCurrentState = (row: SatelliteStateDatabaseRow): SatelliteCurrentState => ({
  norad_cat_id: row.norad_cat_id,
  name: row.satellite_name,
  object_type: row.object_type,
  owner: row.owner,
  operational_status: row.operational_status,
  calculated_at: row.calculated_at.toISOString(),
  tle_epoch: row.tle_epoch.toISOString(),
  reference_frame: row.reference_frame,
  position_km: {
    x: row.position_x_km,
    y: row.position_y_km,
    z: row.position_z_km,
  },
  velocity_km_s: {
    x: row.velocity_x_km_s,
    y: row.velocity_y_km_s,
    z: row.velocity_z_km_s,
  },
  height_km: row.height_km,
  speed_km_s: row.speed_km_s,
  latitude_degrees: row.latitude_degrees,
  longitude_degrees: row.longitude_degrees,
  inclination_degrees: row.inclination_degrees,
  raan_degrees: row.raan_degrees,
  orbital_period_minutes: row.orbital_period_minutes,
  apogee_km: row.apogee_km,
  perigee_km: row.perigee_km,
  revolution_number: row.revolution_number,
});

export const getLatestSatelliteStates = async (limit: number): Promise<SatelliteStateCollection> => {
  const rows = await findLatestSatelliteStates(limit);
  const states = rows.map(toSatelliteCurrentState);

  return {
    states,
    count: states.length,
    limit,
  };
};

export const getLatestSatelliteState = async (noradCatId: number): Promise<SatelliteCurrentState> => {
  const row = await findLatestSatelliteState(noradCatId);

  if (!row) {
    throw new SatelliteStateNotFoundError(noradCatId);
  }

  return toSatelliteCurrentState(row);
};

const nearbyRadiusKm = 1_000;

export const getNearbySatelliteStates = async (
  primaryNoradCatId: number,
  page: number,
  pageSize: number,
): Promise<NearbySatellitePage> => {
  const [primaryRow, nearby] = await Promise.all([
    findLatestSatelliteState(primaryNoradCatId),
    findNearbySatelliteStates(primaryNoradCatId, nearbyRadiusKm, page, pageSize),
  ]);

  if (!primaryRow) {
    throw new SatelliteStateNotFoundError(primaryNoradCatId);
  }

  return {
    primary_satellite: toSatelliteCurrentState(primaryRow),
    radius_km: nearbyRadiusKm,
    satellites: nearby.rows.map((row) => ({
      ...toSatelliteCurrentState(row),
      separation_km: row.separation_km,
      relative_velocity_km_s: row.relative_velocity_km_s,
    })),
    page: {
      number: page,
      size: pageSize,
      total_items: nearby.total,
      total_pages: Math.ceil(nearby.total / pageSize),
    },
  };
};
