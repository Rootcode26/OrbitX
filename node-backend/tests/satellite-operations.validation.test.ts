import assert from "node:assert/strict";
import test from "node:test";
import {
  groundStationPassRequestSchema,
  satelliteConjunctionScreenRequestSchema,
  satelliteTrajectoryRequestSchema,
} from "../src/modules/satelites/validation/satellite-operations.validation.ts";

test("trajectory defaults to a bounded 24-hour sample set", () => {
  const result = satelliteTrajectoryRequestSchema.parse({ norad_cat_id: 25544 });

  assert.equal(result.duration_minutes, 1_440);
  assert.equal(result.step_seconds, 600);
  assert.ok(result.start_time.length > 0);
});

test("trajectory rejects requests containing more than 145 samples", () => {
  const result = satelliteTrajectoryRequestSchema.safeParse({
    norad_cat_id: 25544,
    start_time: "2026-08-28T10:00:00Z",
    duration_minutes: 1_440,
    step_seconds: 60,
  });

  assert.equal(result.success, false);
});

test("ground-station requests require unique station IDs", () => {
  const station = {
    id: "perth",
    name: "Perth",
    latitude_degrees: -31.95,
    longitude_degrees: 115.86,
    altitude_meters: 30,
  };
  const result = groundStationPassRequestSchema.safeParse({
    norad_cat_id: 25544,
    stations: [station, station],
  });

  assert.equal(result.success, false);
});

test("automatic conjunction screening is limited to twenty candidates", () => {
  assert.equal(satelliteConjunctionScreenRequestSchema.parse({
    primary_norad_id: 25544,
  }).candidate_limit, 20);
  assert.equal(satelliteConjunctionScreenRequestSchema.safeParse({
    primary_norad_id: 25544,
    candidate_limit: 21,
  }).success, false);
});
