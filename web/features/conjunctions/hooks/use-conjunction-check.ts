"use client";

import { useMutation } from "@tanstack/react-query";
import { useOrbitAuth } from "@/providers/auth-provider";
import { checkConjunction } from "../api";
import type { ConjunctionCheckRequest } from "../types";

export function useConjunctionCheck() {
  const auth = useOrbitAuth();

  return useMutation({
    mutationKey: ["conjunctions", "check"],
    mutationFn: async (request: ConjunctionCheckRequest) => {
      const token = await auth.getToken();
      if (!token) {
        auth.openSignIn();
        throw new Error("Authentication required");
      }
      return checkConjunction(token, request);
    },
  });
}
