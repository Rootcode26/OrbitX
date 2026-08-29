"use client";

import { useMutation } from "@tanstack/react-query";
import { screenConjunctionCandidates } from "../api";

export function useConjunctionScreen() {
  return useMutation({
    mutationKey: ["conjunctions", "screen"],
    mutationFn: screenConjunctionCandidates,
  });
}
