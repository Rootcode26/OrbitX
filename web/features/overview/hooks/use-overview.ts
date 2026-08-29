"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchOverview } from "../api";

export const overviewQueryKey = ["overview"] as const;

export function useOverview() {
  return useQuery({
    queryKey: overviewQueryKey,
    queryFn: fetchOverview,
    refetchInterval: 60_000,
  });
}
