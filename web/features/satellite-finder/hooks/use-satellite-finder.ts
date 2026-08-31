"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useOrbitAuth } from "@/providers/auth-provider";
import {
  compareSatelliteFinder,
  fetchNearbySatellites,
  type SatelliteFinderComparisonRequest,
} from "../api";

export function useNearbySatellites(primaryNoradId: number | null, page: number, pageSize: number) {
  return useQuery({
    queryKey: ["satellite-finder", "nearby", primaryNoradId, page, pageSize],
    queryFn: () => fetchNearbySatellites(primaryNoradId as number, page, pageSize),
    enabled: primaryNoradId !== null,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function useSatelliteFinderComparison() {
  const auth = useOrbitAuth();

  return useMutation({
    mutationKey: ["satellite-finder", "compare"],
    mutationFn: async (request: SatelliteFinderComparisonRequest) => {
      const token = await auth.getToken();
      if (!token) {
        auth.openSignIn();
        throw new Error("Authentication required");
      }
      return compareSatelliteFinder(token, request);
    },
  });
}
