"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAlerts } from "../api";
import type { OperationsAlertListQuery } from "../api";

export const alertsQueryKey = ["operations-alerts"] as const;

export function useAlerts(query: OperationsAlertListQuery = {}) {
  return useQuery({
    queryKey: [...alertsQueryKey, query],
    queryFn: () => fetchAlerts(query),
    refetchInterval: 60_000,
  });
}
