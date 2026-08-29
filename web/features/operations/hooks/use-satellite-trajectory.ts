"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchSatelliteTrajectory } from "../api";

export function useSatelliteTrajectory() {
  return useMutation({
    mutationKey: ["operations", "trajectory"],
    mutationFn: fetchSatelliteTrajectory,
  });
}
