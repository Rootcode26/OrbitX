"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrbitAuth } from "@/providers/auth-provider";
import {
  commissionSatellite,
  deleteCommissionedSatellite,
  fetchCommissionedSatellites,
  previewSatellite,
  type SavedMakerSatellite,
  type SatelliteMakerRequest,
} from "../api";

const commissionedSatellitesQueryKey = ["satellite-maker", "commissioned"] as const;

export function useCommissionedSatellites() {
  const auth = useOrbitAuth();

  return useQuery({
    queryKey: commissionedSatellitesQueryKey,
    queryFn: async () => {
      const token = await auth.getToken();
      if (!token) throw new Error("Authentication required");
      return fetchCommissionedSatellites(token);
    },
    enabled: auth.configured && auth.isLoaded && auth.isSignedIn,
  });
}

export function useSatellitePreview() {
  const auth = useOrbitAuth();

  return useMutation({
    mutationKey: ["satellite-maker", "preview"],
    mutationFn: async (request: SatelliteMakerRequest) => {
      const token = await auth.getToken();
      if (!token) {
        auth.openSignIn();
        throw new Error("Authentication required");
      }
      return previewSatellite(token, request);
    },
  });
}

export function useSatelliteCommission() {
  const auth = useOrbitAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["satellite-maker", "commission"],
    mutationFn: async (request: SatelliteMakerRequest) => {
      const token = await auth.getToken();
      if (!token) throw new Error("Authentication required");
      return commissionSatellite(token, request);
    },
    onSuccess: async (satellite, request) => {
      const semiMajorAxisKm = 6_371 + request.altitude_km;
      const orbitalPeriodMinutes = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxisKm, 3) / 398_600.4418) / 60;
      const savedSatellite: SavedMakerSatellite = {
        norad_cat_id: satellite.norad_cat_id,
        name: satellite.name,
        object_type: satellite.object_type,
        operator: satellite.operator,
        epoch_utc: satellite.tle_epoch,
        altitude_km: request.altitude_km,
        inclination_degrees: request.inclination_degrees,
        raan_degrees: request.raan_degrees,
        argument_of_perigee_degrees: request.argument_of_perigee_degrees,
        phase_degrees: request.phase_degrees,
        eccentricity: request.apsis_offset_km / semiMajorAxisKm,
        velocity_km_s: null,
        orbital_period_minutes: orbitalPeriodMinutes,
      };

      queryClient.setQueryData<SavedMakerSatellite[]>(commissionedSatellitesQueryKey, (current = []) => [
        savedSatellite,
        ...current.filter((item) => item.norad_cat_id !== savedSatellite.norad_cat_id),
      ]);
      await queryClient.invalidateQueries({ queryKey: commissionedSatellitesQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["satellite-catalog"] });
    },
  });
}

export function useSatelliteDeletion() {
  const auth = useOrbitAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["satellite-maker", "delete"],
    mutationFn: async (noradCatId: number) => {
      const token = await auth.getToken();
      if (!token) throw new Error("Authentication required");
      await deleteCommissionedSatellite(token, noradCatId);
      return noradCatId;
    },
    onMutate: async (noradCatId) => {
      await queryClient.cancelQueries({ queryKey: commissionedSatellitesQueryKey });
      const previous = queryClient.getQueryData<SavedMakerSatellite[]>(commissionedSatellitesQueryKey);
      queryClient.setQueryData<SavedMakerSatellite[]>(commissionedSatellitesQueryKey, (current = []) =>
        current.filter((satellite) => satellite.norad_cat_id !== noradCatId),
      );
      return { previous };
    },
    onError: (_error, _noradCatId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(commissionedSatellitesQueryKey, context.previous);
      }
    },
    onSettled: async (_data, _error, noradCatId) => {
      queryClient.removeQueries({ queryKey: ["satellite-catalog-item", noradCatId] });
      queryClient.removeQueries({ queryKey: ["satellite-state", noradCatId] });
      queryClient.removeQueries({ queryKey: ["satellite-history", noradCatId] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: commissionedSatellitesQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["satellite-catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["satellite-catalog-options"] }),
        queryClient.invalidateQueries({ queryKey: ["current-satellite-states"] }),
        queryClient.invalidateQueries({ queryKey: ["conjunction-events"] }),
        queryClient.invalidateQueries({ queryKey: ["conjunction-analytics"] }),
        queryClient.invalidateQueries({ queryKey: ["operations-alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
        queryClient.invalidateQueries({ queryKey: ["overview"] }),
        queryClient.invalidateQueries({ queryKey: ["satellite-analytics"] }),
      ]);
    },
  });
}
