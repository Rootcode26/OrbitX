"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDataSources } from "../api";

export const dataSourcesQueryKey = ["data-sources"] as const;

export function useDataSources() {
  return useQuery({
    queryKey: dataSourcesQueryKey,
    queryFn: fetchDataSources,
    refetchInterval: 60_000,
  });
}
