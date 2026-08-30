"use client";

import { useMutation } from "@tanstack/react-query";
import { useOrbitAuth } from "@/providers/auth-provider";
import { compareSatelliteFinder, type SatelliteFinderComparisonRequest } from "../api";

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
