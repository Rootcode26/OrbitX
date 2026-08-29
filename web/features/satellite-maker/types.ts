export type MakerObjectType = "PAYLOAD" | "ROCKET BODY" | "DEBRIS";

export interface SatelliteDraftConfig {
  objectName: string;
  operator: string;
  country: string;
  objectType: MakerObjectType;
  epochUtc: string;
  altitudeKm: number;
  inclinationDegrees: number;
  raanDegrees: number;
  argumentOfPerigeeDegrees: number;
  phaseDegrees: number;
  apsisOffsetKm: number;
  bStar: number;
}

export interface DerivedOrbit {
  semiMajorAxisKm: number;
  apogeeKm: number;
  perigeeKm: number;
  eccentricity: number;
  orbitalPeriodMinutes: number;
  revolutionsPerDay: number;
  currentVelocityKmS: number;
  currentAltitudeKm: number;
  regime: string;
}

export interface SatelliteDraft {
  id: number;
  config: SatelliteDraftConfig;
  orbit: DerivedOrbit;
}

export interface OrbitSliderProps {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

