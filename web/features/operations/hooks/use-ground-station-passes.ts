"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchGroundStationPasses } from "../api";

export function useGroundStationPasses() {
  return useMutation({
    mutationKey: ["operations", "ground-station-passes"],
    mutationFn: fetchGroundStationPasses,
  });
}
