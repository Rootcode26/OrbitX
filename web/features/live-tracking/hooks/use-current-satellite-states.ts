"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCurrentSatelliteStates } from "../api";

export function useCurrentSatelliteStates(limit = 100) {
  return useQuery({ queryKey: ["current-satellite-states", limit], queryFn: () => fetchCurrentSatelliteStates(limit), refetchInterval: 60_000 });
}
