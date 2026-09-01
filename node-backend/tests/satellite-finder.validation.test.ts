import assert from "node:assert/strict";
import test from "node:test";
import { satelliteFinderComparisonRequestSchema } from "../src/modules/satelites/validation/conjunction.validation.ts";

const validRequest = {
  primary_norad_id: 25544,
  comparison_norad_ids: [55074, 55601],
  start_time: "2026-08-28T10:00:00Z",
  duration_minutes: 1_440,
  step_seconds: 60,
};

test("finder comparison accepts one primary satellite and up to twenty counterparts", () => {
  const result = satelliteFinderComparisonRequestSchema.safeParse({
    ...validRequest,
    comparison_norad_ids: Array.from({ length: 20 }, (_, index) => index + 1),
  });

  assert.equal(result.success, true);
});

test("finder comparison accepts a seven-day screening window", () => {
  const result = satelliteFinderComparisonRequestSchema.safeParse({
    ...validRequest,
    duration_minutes: 10_080,
    step_seconds: 300,
  });

  assert.equal(result.success, true);
});

test("finder comparison rejects more than twenty counterparts", () => {
  const result = satelliteFinderComparisonRequestSchema.safeParse({
    ...validRequest,
    comparison_norad_ids: Array.from({ length: 21 }, (_, index) => index + 1),
  });

  assert.equal(result.success, false);
});

test("finder comparison rejects duplicate and self comparison IDs", () => {
  assert.equal(satelliteFinderComparisonRequestSchema.safeParse({
    ...validRequest,
    comparison_norad_ids: [55074, 55074],
  }).success, false);

  assert.equal(satelliteFinderComparisonRequestSchema.safeParse({
    ...validRequest,
    comparison_norad_ids: [25544],
  }).success, false);
});
