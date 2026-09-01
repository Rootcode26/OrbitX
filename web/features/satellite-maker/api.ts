import { requestJson, requestVoid } from "@/lib/api/client";

export type SatelliteMakerObjectType = "PAYLOAD" | "ROCKET_BODY" | "DEBRIS";

export interface SatelliteMakerRequest {
  object_name: string;
  operator: string;
  country: string;
  object_type: SatelliteMakerObjectType;
  epoch_utc: string;
  altitude_km: number;
  inclination_degrees: number;
  raan_degrees: number;
  argument_of_perigee_degrees: number;
  phase_degrees: number;
  apsis_offset_km: number;
  bstar: number;
  temporary_norad_id: number;
  comparison_norad_ids: number[];
}

export interface SatelliteMakerDerivedOrbit {
  semi_major_axis_km: number;
  apogee_km: number;
  perigee_km: number;
  eccentricity: number;
  orbital_period_minutes: number;
  revolutions_per_day: number;
}

export interface SatelliteMakerConjunctionResult {
  norad_cat_id: number;
  name: string;
  result: Record<string, unknown>;
}

export interface SatelliteMakerPreview {
  satellite: {
    norad_cat_id: number;
    name: string;
    operator: string;
    country: string;
    object_type: SatelliteMakerObjectType;
  };
  tle: { line1: string; line2: string };
  orbit: SatelliteMakerDerivedOrbit;
  state: {
    propagation: Record<string, unknown>;
    current: Record<string, unknown>;
    reference_frame: string;
    calculated_at: string;
  };
  conjunctions: SatelliteMakerConjunctionResult[];
}

export interface CommissionedSatellite {
  norad_cat_id: number;
  name: string;
  object_type: SatelliteMakerObjectType;
  operator: string;
  country: string;
  calculated_at: string;
  tle_epoch: string;
}

export interface SavedMakerSatellite {
  norad_cat_id: number;
  name: string;
  object_type: SatelliteMakerObjectType;
  operator: string;
  epoch_utc: string;
  altitude_km: number | null;
  inclination_degrees: number | null;
  raan_degrees: number;
  argument_of_perigee_degrees: number;
  phase_degrees: number;
  eccentricity: number;
  velocity_km_s: number | null;
  orbital_period_minutes: number | null;
}

interface SatelliteMakerPreviewResponse {
  data: SatelliteMakerPreview;
}

interface CommissionedSatelliteResponse {
  data: CommissionedSatellite;
}

interface SavedMakerSatellitesResponse {
  data: SavedMakerSatellite[];
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchCommissionedSatellites(token: string): Promise<SavedMakerSatellite[]> {
  const response = await requestJson<SavedMakerSatellitesResponse>("/satellites/info/maker/commissioned", {
    headers: authHeaders(token),
  });
  return response.data;
}

export async function previewSatellite(
  token: string,
  request: SatelliteMakerRequest,
): Promise<SatelliteMakerPreview> {
  const response = await requestJson<SatelliteMakerPreviewResponse>("/satellites/info/maker/preview", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(request),
  });
  return response.data;
}

export async function commissionSatellite(token: string, request: SatelliteMakerRequest): Promise<CommissionedSatellite> {
  const response = await requestJson<CommissionedSatelliteResponse>("/satellites/info/maker/commission", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(request),
  });
  return response.data;
}

export async function deleteCommissionedSatellite(token: string, noradCatId: number): Promise<void> {
  await requestVoid(`/satellites/info/maker/commissioned/${noradCatId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}
