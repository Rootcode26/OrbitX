import type { GlobeObject } from "./types";

export const MARKER_BASE_SCALE = 0.6;
export const SELECTED_MARKER_SCALE = 1.35;

const MINIMUM_RCS_SCALE = 0.6;
const MAXIMUM_RCS_SCALE = 1.4;

export function medianRadarCrossSection(objects: GlobeObject[]): number | null {
  const values = objects
    .map((object) => object.radarCrossSectionM2)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  if (values.length === 0) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? (values[middle - 1] + values[middle]) / 2
    : values[middle];
}

export function radarCrossSectionMarkerScale(
  radarCrossSectionM2: number | null | undefined,
  medianM2: number | null,
) {
  if (
    radarCrossSectionM2 === null
    || radarCrossSectionM2 === undefined
    || medianM2 === null
    || !Number.isFinite(radarCrossSectionM2)
    || radarCrossSectionM2 <= 0
    || medianM2 <= 0
  ) return 1;

  return Math.min(
    MAXIMUM_RCS_SCALE,
    Math.max(MINIMUM_RCS_SCALE, Math.sqrt(radarCrossSectionM2 / medianM2)),
  );
}
