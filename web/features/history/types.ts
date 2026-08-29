export interface ElementSetRecord {
  sequence: number;
  epochUtc: string;
  tleEpoch: string;
  altitudeKm: number;
  apogeeKm: number;
  perigeeKm: number;
  altitudeDeltaKm: number | null;
  inclinationDegrees: number;
  raanDegrees: number;
  meanMotionRevolutionsPerDay: number;
  bstar: number | null;
  source: string;
  altitudeIncrease: boolean;
}
