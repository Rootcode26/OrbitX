import type { SatelliteDraftConfig } from "./types";

export const defaultSatelliteDraft: SatelliteDraftConfig = {
  objectName: "AURORA-1",
  operator: "Independent operator",
  country: "USA",
  objectType: "PAYLOAD",
  epochUtc: "2026-08-27T15:00",
  altitudeKm: 552,
  inclinationDegrees: 53.2,
  raanDegrees: 128,
  argumentOfPerigeeDegrees: 42,
  phaseDegrees: 61,
  apsisOffsetKm: 23,
  bStar: 0.0001,
};

export const countryOptions = ["USA", "CIS", "PRC", "ESA", "IND", "JPN", "UK", "OTHER"];

