import { requestJson } from "@/lib/api/client";
import type { GlobeObject } from "@/features/globe/types";
import type {
  CurrentSatelliteStateApiRecord,
  CurrentSatelliteStateResponse,
  CurrentSatelliteStatesResponse,
  LiveSatelliteState,
} from "./types";

const activeOperationalStatuses = new Set(["+", "P", "B", "S", "X", "ACTIVE"]);

function isActivePayload(status: string | null) {
  return status !== null && activeOperationalStatuses.has(status.toUpperCase());
}

function objectType(value: string, status: string | null): LiveSatelliteState["objectType"] {
  if (value === "DEB") return "Debris";
  if (value === "R/B") return "Rocket body";
  return isActivePayload(status) ? "Payload" : "Inactive payload";
}

export function toGlobeObject(state: CurrentSatelliteStatesResponse["data"]["states"][number]): GlobeObject {
  const meanApsis = Math.max(0, (state.apogee_km + state.perigee_km) / 2);
  const eccentricity = Math.max(0, Math.min(0.25, (state.apogee_km - state.perigee_km) / Math.max(2 * (6371 + meanApsis), 1)));
  const objectClass = state.object_type === "DEB" ? "debris" : state.object_type === "R/B" ? "rocket" : isActivePayload(state.operational_status) ? "active" : "inactive";
  return {
    id: state.norad_cat_id,
    name: state.name,
    objectClass,
    orbitRadius: 1 + Math.max(state.height_km, 0) / 6371,
    inclination: state.inclination_degrees,
    raan: state.raan_degrees,
    argumentOfPerigee: 0,
    eccentricity,
    phase: Math.atan2(state.position_km.y, state.position_km.x),
    angularSpeed: 0.055 * (95 / Math.max(state.orbital_period_minutes, 1)),
  };
}

function toLiveSatelliteState(state: CurrentSatelliteStateApiRecord): LiveSatelliteState {
  return {
    noradCatId: state.norad_cat_id,
    name: state.name,
    owner: state.owner ?? "Unknown",
    objectType: objectType(state.object_type, state.operational_status),
    observationTimeUtc: state.calculated_at,
    eci: { xKm: state.position_km.x, yKm: state.position_km.y, zKm: state.position_km.z, velocityXKmS: state.velocity_km_s.x, velocityYKmS: state.velocity_km_s.y, velocityZKmS: state.velocity_km_s.z },
    latitudeDegrees: state.latitude_degrees,
    longitudeDegrees: state.longitude_degrees,
    altitudeKm: state.height_km,
    inclinationDegrees: state.inclination_degrees,
    orbitalPeriodMinutes: state.orbital_period_minutes,
    speedKmS: Math.hypot(state.velocity_km_s.x, state.velocity_km_s.y, state.velocity_km_s.z),
    revolution: state.revolution_number,
    globeObject: toGlobeObject(state),
  };
}

export async function fetchCurrentSatelliteStates(limit = 100) {
  const response = await requestJson<CurrentSatelliteStatesResponse>(`/satellites/info/states/current?limit=${limit}`);
  return response.data.states.map(toLiveSatelliteState);
}

export async function fetchCurrentSatelliteState(noradCatId: number) {
  const response = await requestJson<CurrentSatelliteStateResponse>(`/satellites/info/states/${noradCatId}/current`);
  return toLiveSatelliteState(response.data);
}
