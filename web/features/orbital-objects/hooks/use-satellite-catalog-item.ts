"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSatelliteCatalogItem } from "../api";

export function useSatelliteCatalogItem(noradCatId: number | null) {
  return useQuery({
    queryKey: ["satellite-catalog-item", noradCatId],
    queryFn: () => fetchSatelliteCatalogItem(noradCatId as number),
    enabled: noradCatId !== null,
  });
}
