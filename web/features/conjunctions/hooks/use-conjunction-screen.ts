"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrbitAuth } from "@/providers/auth-provider";
import { screenConjunctionCandidates } from "../api";
import type { ConjunctionScreenRequest } from "../types";

export function useConjunctionScreen() {
  const auth = useOrbitAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["conjunctions", "screen"],
    mutationFn: async (request: ConjunctionScreenRequest) => {
      const token = await auth.getToken();
      if (!token) {
        auth.openSignIn();
        throw new Error("Authentication required");
      }
      return screenConjunctionCandidates(token, request);
    },
    // Screening persists new conjunction events on the backend, so refresh every
    // view that reads the events list (conjunctions page, overview cards,
    // orbital-objects list) and the analytics/alerts derived from them.
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conjunction-events"] }),
        queryClient.invalidateQueries({ queryKey: ["conjunction-analytics"] }),
        queryClient.invalidateQueries({ queryKey: ["operations-alerts"] }),
      ]);
    },
  });
}
