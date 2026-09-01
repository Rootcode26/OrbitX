"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSatelliteAnalytics } from "../api";

export const satelliteAnalyticsQueryKey = ["satellite-analytics"] as const;

export function useSatelliteAnalytics() {
  return useQuery({
    queryKey: satelliteAnalyticsQueryKey,
    queryFn: fetchSatelliteAnalytics,
    staleTime: 60_000,
  });
}
