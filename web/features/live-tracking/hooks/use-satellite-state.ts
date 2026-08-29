"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCurrentSatelliteState } from "../api";

export function useSatelliteState(noradCatId: number | null) {
  return useQuery({
    queryKey: ["satellite-state", noradCatId],
    queryFn: () => fetchCurrentSatelliteState(noradCatId as number),
    enabled: noradCatId !== null,
    refetchInterval: 60_000,
  });
}
