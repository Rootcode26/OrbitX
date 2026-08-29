"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBackendReadiness } from "../api";

export const backendReadinessQueryKey = ["backend", "readiness"] as const;

export function useBackendReadiness() {
  return useQuery({
    queryKey: backendReadinessQueryKey,
    queryFn: fetchBackendReadiness,
    refetchInterval: 30_000,
  });
}
