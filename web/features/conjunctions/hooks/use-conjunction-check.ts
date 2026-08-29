"use client";

import { useMutation } from "@tanstack/react-query";
import { checkConjunction } from "../api";

export function useConjunctionCheck() {
  return useMutation({
    mutationKey: ["conjunctions", "check"],
    mutationFn: checkConjunction,
  });
}
