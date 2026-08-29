export type CelestrakFetchState = "fresh" | "cached";

export interface CelestrakFetchResult<T> {
  state: CelestrakFetchState;
  records: T[];
  httpStatus: number;
}

export interface SatcatRecord {
  noradCatId: number;
  satelliteName: string;
  objectType: "PAY" | "R/B" | "DEB" | "UNK" | null;
  owner: string | null;
  operationalStatus: "+" | "-" | "P" | "B" | "S" | "X" | "D" | "?" | null;
  launchDate: string | null;
  launchSite: string | null;
  decayDate: string | null;
  internationalDesignator: string | null;
  radarCrossSection: number | null;
  dataStatusCode: "NCE" | "NIE" | "NEA" | null;
  orbitCenter: string | null;
  orbitType: "ORB" | "LAN" | "IMP" | "DOC" | "R/T" | null;
  orbitalPeriodMinutes: number | null;
  inclinationDegrees: number | null;
  apogeeKm: number | null;
  perigeeKm: number | null;
}

export interface TleRecord {
  noradCatId: number;
  satelliteName: string;
  epoch: string;
  tleLine1: string;
  tleLine2: string;
  inclinationDegrees: number | null;
  orbitalPeriodMinutes: number | null;
  apogeeKm: number | null;
  perigeeKm: number | null;
}

export interface StoredTleRecord {
  noradCatId: number;
  satelliteName: string;
  epoch: string;
  tleLine1: string;
  tleLine2: string;
}

export type CelestrakSyncState = "updated" | "cached" | "failed";

export interface CelestrakSourceSummary {
  state: CelestrakSyncState;
  records: number;
  error?: string;
}

export interface CelestrakSyncSummary {
  satcat: CelestrakSourceSummary;
  tle: CelestrakSourceSummary;
}

export interface CelestrakSyncRuntimeStatus {
  completedAt: string;
  summary: CelestrakSyncSummary;
}
