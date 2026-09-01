"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

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
    onSuccess: async () => {
      // Comparisons are persisted as conjunction events by the backend. Refresh
      // every view that reads those events so a completed check appears without
      // requiring a hard reload or waiting for the query's stale interval.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conjunction-events"] }),
        queryClient.invalidateQueries({ queryKey: ["conjunction-analytics"] }),
        queryClient.invalidateQueries({ queryKey: ["operations-alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["data-sources"] }),
      ]);
    },
  });
}
