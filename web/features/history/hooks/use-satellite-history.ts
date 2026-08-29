"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchSatelliteHistory } from "../api";
import type { SatelliteHistoryQuery } from "../api";

export function useSatelliteHistory(noradCatId: number | null, query: SatelliteHistoryQuery = {}) {
  return useQuery({
    queryKey: ["satellite-history", noradCatId, query],
    queryFn: () => fetchSatelliteHistory(noradCatId as number, query),
    enabled: noradCatId !== null,
    placeholderData: keepPreviousData,
  });
}
