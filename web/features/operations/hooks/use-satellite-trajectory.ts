"use client";

import { useMutation } from "@tanstack/react-query";
import { useOrbitAuth } from "@/providers/auth-provider";
import { fetchSatelliteTrajectory, type SatelliteTrajectoryRequest } from "../api";

export function useSatelliteTrajectory() {
  const auth = useOrbitAuth();

  return useMutation({
    mutationKey: ["operations", "trajectory"],
    mutationFn: async (request: SatelliteTrajectoryRequest) => {
      const token = await auth.getToken();
      if (!token) {
        auth.openSignIn();
        throw new Error("Authentication required");
      }
      return fetchSatelliteTrajectory(token, request);
    },
  });
}
