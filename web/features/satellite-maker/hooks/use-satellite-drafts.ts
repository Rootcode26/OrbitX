"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  addSatelliteDraft,
  getSatelliteDraftsServerSnapshot,
  getSatelliteDraftsSnapshot,
  removeSatelliteDraft,
  subscribeToSatelliteDrafts,
} from "../draft-storage";
import type { DerivedOrbit, SatelliteDraftConfig } from "../types";

export function useSatelliteDrafts() {
  const drafts = useSyncExternalStore(
    subscribeToSatelliteDrafts,
    getSatelliteDraftsSnapshot,
    getSatelliteDraftsServerSnapshot,
  );

  const saveDraft = useCallback((config: SatelliteDraftConfig, orbit: DerivedOrbit) => {
    addSatelliteDraft({
      id: Date.now(),
      config: { ...config },
      orbit: { ...orbit },
    });
  }, []);

  return {
    drafts,
    saveDraft,
    removeDraft: removeSatelliteDraft,
  };
}
