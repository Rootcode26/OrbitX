"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchConjunctionEvents } from "../api";
import type { ConjunctionEventListQuery } from "../types";

export function useConjunctionEvents(query: ConjunctionEventListQuery = {}) {
  return useQuery({
    queryKey: ["conjunction-events", query],
    queryFn: () => fetchConjunctionEvents(query),
    placeholderData: keepPreviousData,
  });
}
