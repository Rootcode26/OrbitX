"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchConjunctionEvent } from "../api";

export function useConjunctionEvent(eventId: string | null) {
  return useQuery({
    queryKey: ["conjunction-event", eventId],
    queryFn: () => fetchConjunctionEvent(eventId as string),
    enabled: Boolean(eventId),
  });
}
