"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrbitAuth } from "@/providers/auth-provider";
import {
  acknowledgeAlert,
  createAlert,
  resolveAlert,
  type OperationsAlertCreateRequest,
} from "../api";
import { alertsQueryKey } from "./use-alerts";

async function requireToken(auth: ReturnType<typeof useOrbitAuth>): Promise<string> {
  const token = await auth.getToken();
  if (token) return token;
  auth.openSignIn();
  throw new Error("Authentication required");
}

export function useCreateAlert() {
  const auth = useOrbitAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["operations-alerts", "create"],
    mutationFn: async (request: OperationsAlertCreateRequest) => createAlert(await requireToken(auth), request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsQueryKey }),
  });
}

export function useAcknowledgeAlert() {
  const auth = useOrbitAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["operations-alerts", "acknowledge"],
    mutationFn: async (alertId: string) => acknowledgeAlert(await requireToken(auth), alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsQueryKey }),
  });
}

export function useResolveAlert() {
  const auth = useOrbitAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["operations-alerts", "resolve"],
    mutationFn: async (alertId: string) => resolveAlert(await requireToken(auth), alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsQueryKey }),
  });
}
