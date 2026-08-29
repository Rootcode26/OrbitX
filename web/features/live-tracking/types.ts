export interface EciStateVector {
  xKm: number;
  yKm: number;
  zKm: number;
  velocityXKmS: number;
  velocityYKmS: number;
  velocityZKmS: number;
}

export interface LiveSatelliteState {
  noradCatId: number;
  name: string;
  owner: string;
  objectType: "Payload" | "Inactive payload" | "Debris" | "Rocket body";
  observationTimeUtc: string;
  eci: EciStateVector;
  latitudeDegrees: number;
  longitudeDegrees: number;
  altitudeKm: number;
  inclinationDegrees: number;
  orbitalPeriodMinutes: number;
  speedKmS: number;
  revolution: number;
  globeObject: GlobeObject;
}

export interface CurrentSatelliteStateApiRecord {
  norad_cat_id: number;
  name: string;
  object_type: string;
  owner: string | null;
  operational_status: string | null;
  calculated_at: string;
  reference_frame: string;
  position_km: { x: number; y: number; z: number };
  velocity_km_s: { x: number; y: number; z: number };
  height_km: number;
  latitude_degrees: number;
  longitude_degrees: number;
  inclination_degrees: number;
  raan_degrees: number;
  orbital_period_minutes: number;
  apogee_km: number;
  perigee_km: number;
  revolution_number: number;
}

export interface CurrentSatelliteStatesResponse {
  data: { states: CurrentSatelliteStateApiRecord[]; count: number; limit: number };
}

export interface CurrentSatelliteStateResponse {
  data: CurrentSatelliteStateApiRecord;
}
import type { GlobeObject } from "@/features/globe/types";
