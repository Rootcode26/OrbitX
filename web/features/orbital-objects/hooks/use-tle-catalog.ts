"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTleCatalog } from "../api";

export const tleCatalogQueryKey = ["satellites", "tle-catalog"] as const;

export function useTleCatalog() {
  return useQuery({
    queryKey: tleCatalogQueryKey,
    queryFn: fetchTleCatalog,
    staleTime: 10 * 60_000,
  });
}
