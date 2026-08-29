import {
  CelestrakSyncRuntimeStatus,
  CelestrakSyncSummary,
} from "../celestrak.types.ts";

let latestStatus: CelestrakSyncRuntimeStatus | null = null;

export const recordCelestrakSyncStatus = (summary: CelestrakSyncSummary, completedAt = new Date()): void => {
  latestStatus = {
    completedAt: completedAt.toISOString(),
    summary,
  };
};

export const getCelestrakSyncStatus = (): CelestrakSyncRuntimeStatus | null => (
  latestStatus
);
