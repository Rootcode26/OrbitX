"use client";

import { useMutation } from "@tanstack/react-query";
import { useOrbitAuth } from "@/providers/auth-provider";
import { screenConjunctionCandidates } from "../api";
import type { ConjunctionScreenRequest } from "../types";

export function useConjunctionScreen() {
  const auth = useOrbitAuth();

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
  });
}
