"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { acknowledgeAlert, createAlert, resolveAlert } from "../api";
import { alertsQueryKey } from "./use-alerts";

export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["operations-alerts", "create"],
    mutationFn: createAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsQueryKey }),
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["operations-alerts", "acknowledge"],
    mutationFn: acknowledgeAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsQueryKey }),
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["operations-alerts", "resolve"],
    mutationFn: resolveAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsQueryKey }),
  });
}
