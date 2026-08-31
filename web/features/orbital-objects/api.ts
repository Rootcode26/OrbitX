import { requestJson, requestText } from "@/lib/api/client";
import type {
  OrbitalObject,
  SatelliteCatalogApiRecord,
  SatelliteCatalogItemResponse,
  SatelliteCatalogOptionsResponse,
  SatelliteCatalogQuery,
  SatelliteCatalogResponse,
  TleCatalogRecord,
} from "./types";

function parseTleCatalog(text: string): TleCatalogRecord[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.length % 3 !== 0) {
    throw new Error("The TLE catalog response is incomplete");
  }

  const records: TleCatalogRecord[] = [];

  for (let index = 0; index < lines.length; index += 3) {
    const name = lines[index];
    const tleLine1 = lines[index + 1];
    const tleLine2 = lines[index + 2];

    if (!name || !tleLine1?.startsWith("1 ") || !tleLine2?.startsWith("2 ")) {
      throw new Error("The TLE catalog response contains an invalid record");
    }

    records.push({ name, tleLine1, tleLine2 });
  }

  return records;
}

export async function fetchTleCatalog(): Promise<TleCatalogRecord[]> {
  const response = await requestText("/satellites/info/all");
  return parseTleCatalog(response);
}

function objectType(value: string | null): OrbitalObject["objectType"] {
  if (value === "R/B") return "ROCKET BODY";
  if (value === "DEB") return "DEBRIS";
  if (value === "PAY") return "PAYLOAD";
  return "UNKNOWN";
}

// Matches the backend's active operational-status set.
const activeOperationalStatuses = new Set(["+", "P", "B", "S", "X", "ACTIVE"]);

function status(value: string | null): OrbitalObject["status"] {
  return value && activeOperationalStatuses.has(value.toUpperCase()) ? "ACTIVE" : "INACTIVE";
}

function toOrbitalObject(item: SatelliteCatalogApiRecord): OrbitalObject {
  return {
    id: String(item.norad_cat_id),
    noradCatId: item.norad_cat_id,
    name: item.name,
    internationalDesignator: item.international_designator ?? item.name,
    objectType: objectType(item.object_type),
    status: status(item.operational_status),
    owner: item.owner ?? "Unknown",
    launchDate: item.launch_date ? item.launch_date.slice(0, 10) : "Unknown",
    // height_km is a live-state value (only for propagated objects); fall back to
    // the mean of the TLE-derived apogee/perigee, matching the backend.
    altitudeKm: item.height_km
      ?? (item.apogee_km !== null && item.perigee_km !== null ? (item.apogee_km + item.perigee_km) / 2 : null),
    apogeeKm: item.apogee_km,
    perigeeKm: item.perigee_km,
    inclinationDegrees: item.inclination_degrees,
    raanDegrees: item.raan_degrees,
    velocityKmS: item.speed_km_s,
    orbitalPeriodMinutes: item.orbital_period_minutes,
    tleEpoch: item.tle_epoch,
    lastUpdatedMinutes: item.calculated_at ? Math.max(0, Math.round((Date.now() - new Date(item.calculated_at).getTime()) / 60_000)) : null,
    risk: null,
  };
}

export async function fetchSatelliteCatalog(query: SatelliteCatalogQuery) {
  const params = new URLSearchParams({
    page: String(query.page),
    page_size: String(query.pageSize),
    sort: query.sort === "velocity" ? "speed" : query.sort,
    direction: "asc",
  });
  const { filters } = query;
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.objectType !== "ALL") {
    params.set(
      "object_type",
      filters.objectType === "ROCKET BODY"
        ? "R/B"
        : filters.objectType === "DEBRIS"
          ? "DEB"
          : filters.objectType === "UNKNOWN" ? "UNK" : "PAY",
    );
  }
  if (filters.status !== "ANY") params.set("status", filters.status.toLowerCase());
  if (filters.owner !== "ALL") params.set("owner", filters.owner);
  if (filters.minimumAltitude !== null) params.set("minimum_altitude_km", String(filters.minimumAltitude));
  if (filters.maximumAltitude !== null) params.set("maximum_altitude_km", String(filters.maximumAltitude));

  const response = await requestJson<SatelliteCatalogResponse>(`/satellites/info/catalog?${params}`);
  return {
    objects: response.data.satellites.map(toOrbitalObject),
    page: response.data.page,
  };
}

export async function fetchSatelliteCatalogItem(noradCatId: number): Promise<OrbitalObject> {
  const response = await requestJson<SatelliteCatalogItemResponse>(`/satellites/info/catalog/${noradCatId}`);
  return toOrbitalObject(response.data);
}

export async function fetchSatelliteCatalogOptions() {
  const response = await requestJson<SatelliteCatalogOptionsResponse>("/satellites/info/catalog/options");
  return response.data;
}
