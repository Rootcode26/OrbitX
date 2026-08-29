"use client";

import { useMutation } from "@tanstack/react-query";
import { compareSatelliteFinder } from "../api";

export function useSatelliteFinderComparison() {
  return useMutation({
    mutationKey: ["satellite-finder", "compare"],
    mutationFn: compareSatelliteFinder,
  });
}
