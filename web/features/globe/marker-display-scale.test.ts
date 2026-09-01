import assert from "node:assert/strict";
import test from "node:test";
import {
  MARKER_BASE_SCALE,
  SELECTED_MARKER_SCALE,
  medianRadarCrossSection,
  radarCrossSectionMarkerScale,
} from "./marker-display-scale.ts";
import type { GlobeObject } from "./types.ts";

// The helpers only read radarCrossSectionM2, so the other GlobeObject fields
// are irrelevant to these tests and are omitted from the fixtures.
function withRcs(...values: Array<number | null | undefined>): GlobeObject[] {
  return values.map((radarCrossSectionM2) => ({ radarCrossSectionM2 }) as GlobeObject);
}

test("marker base scale encodes the 40% marker shrink", () => {
  assert.equal(MARKER_BASE_SCALE, 0.6);
  assert.equal(SELECTED_MARKER_SCALE, 1.35);
});

test("median RCS returns null when no positive finite values exist", () => {
  assert.equal(medianRadarCrossSection([]), null);
  assert.equal(medianRadarCrossSection(withRcs(null, undefined, 0, -4, NaN, Infinity)), null);
});

test("median RCS returns the middle of an odd count of valid values", () => {
  assert.equal(medianRadarCrossSection(withRcs(3, 1, 2)), 2);
});

test("median RCS averages the two middle values for an even count", () => {
  assert.equal(medianRadarCrossSection(withRcs(4, 1, 3, 2)), 2.5);
});

test("median RCS ignores non-positive and non-finite values before ranking", () => {
  // Only 1 and 4 are valid -> sorted [1, 4] -> median 2.5.
  assert.equal(medianRadarCrossSection(withRcs(4, 0, -1, NaN, 1)), 2.5);
});

test("marker scale falls back to 1 for missing or invalid inputs", () => {
  assert.equal(radarCrossSectionMarkerScale(null, 2), 1);
  assert.equal(radarCrossSectionMarkerScale(undefined, 2), 1);
  assert.equal(radarCrossSectionMarkerScale(4, null), 1);
  assert.equal(radarCrossSectionMarkerScale(0, 2), 1);
  assert.equal(radarCrossSectionMarkerScale(-5, 2), 1);
  assert.equal(radarCrossSectionMarkerScale(4, 0), 1);
  assert.equal(radarCrossSectionMarkerScale(NaN, 2), 1);
});

test("marker scale is 1 when an object matches the median RCS", () => {
  assert.equal(radarCrossSectionMarkerScale(2, 2), 1);
});

test("marker scale grows with the square root of the RCS ratio", () => {
  // sqrt(2.88 / 2) = sqrt(1.44) = 1.2, within the clamp range.
  assert.equal(radarCrossSectionMarkerScale(2.88, 2), 1.2);
});

test("marker scale clamps large objects to the 1.4 ceiling", () => {
  // sqrt(4) = 2 -> clamped to the maximum.
  assert.equal(radarCrossSectionMarkerScale(8, 2), 1.4);
});

test("marker scale clamps tiny objects to the 0.6 floor", () => {
  // sqrt(0.25) = 0.5 -> clamped to the minimum.
  assert.equal(radarCrossSectionMarkerScale(0.5, 2), 0.6);
});
