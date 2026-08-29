"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchConjunctionAnalytics } from "../api";

export function useConjunctionAnalytics(days = 14) {
  return useQuery({
    queryKey: ["conjunction-analytics", days],
    queryFn: () => fetchConjunctionAnalytics(days),
  });
}
