import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeConjunctionResult,
  shouldPersistConjunctionEvent,
} from "../src/modules/satelites/services/conjunction-event.services.ts";

const request = {
  satellite_a_norad_id: 25544,
  satellite_b_norad_id: 55074,
  start_time: "2026-08-28T10:00:00Z",
  duration_minutes: 1_440,
  step_seconds: 60,
};

test("conjunction results normalize common response fields", () => {
  const result = normalizeConjunctionResult(request, {
    computed_at_utc: "2026-08-28T10:01:00Z",
    tca_utc: "2026-08-28T12:00:00Z",
    minimum_separation_m: 810,
    relative_velocity_km_s: 13.8,
    collision_probability: 0.0014,
    risk_score: 87,
    encounter_angle_degrees: 141,
    radial_uncertainty_m: 122,
    separation_profile: [{ offset_seconds: 0, separation_km: 0.81 }],
  });

  assert.equal(result.minimum_separation_km, 0.81);
  assert.equal(result.risk_level, "CRITICAL");
  assert.equal(result.tca, "2026-08-28T12:00:00.000Z");
  assert.equal(result.separation_profile?.length, 1);
});

test("conjunction results normalize the Python response contract", () => {
  const result = normalizeConjunctionResult(request, {
    calculated_at: "2026-08-28T10:01:00Z",
    closest_approach_time_utc: "2026-08-28T12:00:00Z",
    minimum_separation_km: 0.81,
    risk_score: 87,
    separation_samples: [{ timestamp: "2026-08-28T12:00:00Z", separation_km: 0.81 }],
  });

  assert.equal(result.computed_at, "2026-08-28T10:01:00.000Z");
  assert.equal(result.tca, "2026-08-28T12:00:00.000Z");
  assert.equal(result.separation_profile?.length, 1);
});

test("provider risk is preserved regardless of miss distance", () => {
  const result = normalizeConjunctionResult(request, {
    minimum_separation_km: 8_006,
    risk_score: 20,
    risk_level: "LOW",
  });

  assert.equal(result.risk_level, "LOW");
});

test("close separation cannot be persisted as clear", () => {
  const result = normalizeConjunctionResult(request, {
    minimum_separation_km: 5,
    risk_level: "CLEAR",
  });

  assert.equal(result.risk_level, "MEDIUM");

  const collision = normalizeConjunctionResult(request, {
    minimum_separation_km: 0,
    risk_level: "CLEAR",
  });
  assert.equal(collision.risk_level, "CRITICAL");
});

test("conjunction risk falls back to miss distance when no explicit score exists", () => {
  assert.equal(normalizeConjunctionResult(request, { minimum_separation_km: 2 }).risk_level, "HIGH");
  assert.equal(normalizeConjunctionResult(request, { minimum_separation_km: 30 }).risk_level, "LOW");
});

test("only close approaches inside the seven-day screening window are persisted", () => {
  const eligible = normalizeConjunctionResult({ ...request, duration_minutes: 10_080 }, {
    closest_approach_time_utc: "2026-09-03T10:00:00Z",
    minimum_separation_km: 5,
  });
  const tooFar = { ...eligible, minimum_separation_km: 500.01 };
  const outsideWindow = { ...eligible, tca: "2026-09-05T10:00:01.000Z" };

  assert.equal(shouldPersistConjunctionEvent(eligible), true);
  assert.equal(shouldPersistConjunctionEvent(tooFar), false);
  assert.equal(shouldPersistConjunctionEvent(outsideWindow), false);
});
