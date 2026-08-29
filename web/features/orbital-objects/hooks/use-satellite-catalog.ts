"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchSatelliteCatalog, fetchSatelliteCatalogOptions } from "../api";
import type { SatelliteCatalogQuery } from "../types";

export function useSatelliteCatalog(query: SatelliteCatalogQuery) {
  return useQuery({
    queryKey: ["satellite-catalog", query],
    queryFn: () => fetchSatelliteCatalog(query),
    placeholderData: keepPreviousData,
  });
}

export function useSatelliteCatalogOptions() {
  return useQuery({ queryKey: ["satellite-catalog-options"], queryFn: fetchSatelliteCatalogOptions });
}
