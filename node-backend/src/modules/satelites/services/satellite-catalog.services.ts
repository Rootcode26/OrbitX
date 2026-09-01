import {
  findSatelliteCatalogPage,
  findSatelliteCatalogRecord,
  findSatelliteCatalogOptions,
} from "../repositories/satellite-catalog.repository.ts";
import {
  SatelliteCatalogDatabaseRow,
  SatelliteCatalogPage,
  SatelliteCatalogOptions,
  SatelliteCatalogQuery,
  SatelliteCatalogRecord,
} from "../types.ts";
import { SatelliteNotFoundError } from "./satellite-read.errors.ts";

const toIsoDate = (value: Date | null): string | null => (
  value ? value.toISOString() : null
);

const toVector = (x: number | null, y: number | null, z: number | null) => (
  x === null || y === null || z === null
    ? null
    : { x, y, z }
);

const toCatalogRecord = (row: SatelliteCatalogDatabaseRow): SatelliteCatalogRecord => ({
  norad_cat_id: row.norad_cat_id,
  name: row.satellite_name,
  object_type: row.object_type,
  owner: row.owner,
  operational_status: row.operational_status,
  international_designator: row.international_designator,
  launch_date: row.launch_date,
  launch_site: row.launch_site,
  decay_date: row.decay_date,
  radar_cross_section: row.radar_cross_section,
  data_status_code: row.data_status_code,
  orbit_center: row.orbit_center,
  orbit_type: row.orbit_type,
  tle_epoch: toIsoDate(row.tle_epoch),
  calculated_at: toIsoDate(row.calculated_at),
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
  reference_frame: row.reference_frame,
  position_km: toVector(
    row.position_x_km,
    row.position_y_km,
    row.position_z_km,
  ),
  velocity_km_s: toVector(
    row.velocity_x_km_s,
    row.velocity_y_km_s,
    row.velocity_z_km_s,
  ),
});

export const getSatelliteCatalogPage = async (query: SatelliteCatalogQuery, clerkUserId: string | null): Promise<SatelliteCatalogPage> => {
  const { rows, total } = await findSatelliteCatalogPage(query, clerkUserId);

  return {
    satellites: rows.map(toCatalogRecord),
    page: {
      number: query.page,
      size: query.page_size,
      total_items: total,
      total_pages: Math.ceil(total / query.page_size),
    },
  };
};

export const getSatelliteCatalogRecord = async (noradCatId: number, clerkUserId: string | null): Promise<SatelliteCatalogRecord> => {
  const row = await findSatelliteCatalogRecord(noradCatId, clerkUserId);

  if (!row) {
    throw new SatelliteNotFoundError(noradCatId);
  }

  return toCatalogRecord(row);
};

export const getSatelliteCatalogOptions = async (clerkUserId: string | null): Promise<SatelliteCatalogOptions> => {
  const options = await findSatelliteCatalogOptions(clerkUserId);

  return {
    owners: options.owners,
    object_types: ["PAY", "R/B", "DEB", "UNK"],
    altitude_range_km: {
      minimum: options.minimumAltitudeKm,
      maximum: options.maximumAltitudeKm,
    },
  };
};
