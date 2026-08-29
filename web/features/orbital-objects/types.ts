export type CatalogObjectType = "PAYLOAD" | "ROCKET BODY" | "DEBRIS";
export type CatalogObjectStatus = "ACTIVE" | "INACTIVE";
export type CatalogRiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type CatalogTypeFilter = "ALL" | CatalogObjectType;
export type CatalogStatusFilter = "ANY" | CatalogObjectStatus;
export type CatalogRiskFilter = "ANY" | "IN_CONJUNCTION";
export type CatalogSortKey = "name" | "altitude" | "inclination" | "velocity";

export interface OrbitalObject {
  id: string;
  noradCatId: number;
  name: string;
  internationalDesignator?: string;
  objectType: CatalogObjectType;
  status: CatalogObjectStatus;
  owner: string;
  launchDate: string;
  altitudeKm: number;
  apogeeKm: number;
  perigeeKm: number;
  inclinationDegrees: number;
  raanDegrees: number;
  velocityKmS: number;
  orbitalPeriodMinutes: number;
  tleEpoch: string;
  lastUpdatedMinutes: number;
  risk: CatalogRiskLevel | null;
}

export interface CatalogFilters {
  search: string;
  objectType: CatalogTypeFilter;
  status: CatalogStatusFilter;
  risk: CatalogRiskFilter;
  owner: string;
  minimumAltitude: number;
  maximumAltitude: number;
}

export interface ObjectFiltersProps {
  filters: CatalogFilters;
  sortKey: CatalogSortKey;
  owners: string[];
  onFiltersChange: (changes: Partial<CatalogFilters>) => void;
  onSortChange: (sortKey: CatalogSortKey) => void;
  onReset: () => void;
}

export interface ObjectCatalogProps {
  objects: OrbitalObject[];
  selectedObjectId: string;
  currentPage: number;
  totalPages: number;
  totalObjects: number;
  pageSize: number;
  onSelect: (objectId: string) => void;
  onPageChange: (page: number) => void;
}

export interface TleCatalogRecord {
  name: string;
  tleLine1: string;
  tleLine2: string;
}

export interface SatelliteCatalogApiRecord {
  norad_cat_id: number;
  name: string;
  international_designator: string | null;
  object_type: string;
  owner: string | null;
  operational_status: string | null;
  launch_date: string | null;
  tle_epoch: string | null;
  calculated_at: string | null;
  height_km: number | null;
  speed_km_s: number | null;
  inclination_degrees: number | null;
  raan_degrees: number | null;
  orbital_period_minutes: number | null;
  apogee_km: number | null;
  perigee_km: number | null;
}

export interface SatelliteCatalogResponse {
  data: {
    satellites: SatelliteCatalogApiRecord[];
    page: { number: number; size: number; total_items: number; total_pages: number };
  };
}

export interface SatelliteCatalogItemResponse {
  data: SatelliteCatalogApiRecord;
}

export interface SatelliteCatalogOptionsResponse {
  data: {
    owners: string[];
    altitude_range_km: { minimum: number | null; maximum: number | null };
  };
}

export interface SatelliteCatalogQuery {
  page: number;
  pageSize: number;
  filters: CatalogFilters;
  sort: CatalogSortKey;
}
