import assert from "node:assert/strict";
import test from "node:test";
import { buildMakerTle, deriveMakerOrbit } from "../src/modules/satelites/services/tle-builder.services.ts";
import { satelliteMakerRequestSchema } from "../src/modules/satelites/validation/satellite-maker.validation.ts";

const request = satelliteMakerRequestSchema.parse({
  object_name: "AURORA-1",
  operator: "Independent operator",
  country: "USA",
  object_type: "PAYLOAD",
  epoch_utc: "2026-08-27T15:00:00Z",
  altitude_km: 552,
  inclination_degrees: 53.2,
  raan_degrees: 128,
  argument_of_perigee_degrees: 42,
  phase_degrees: 61,
  apsis_offset_km: 23,
  bstar: 0.0001,
});

const tleChecksum = (line: string) => {
  let sum = 0;

  for (const character of line.slice(0, 68)) {
    if (/\d/.test(character)) sum += Number(character);
    if (character === "-") sum += 1;
  }

  return sum % 10;
};

test("maker derives a physically consistent orbit", () => {
  const orbit = deriveMakerOrbit(request);

  assert.equal(orbit.apogee_km, 575);
  assert.equal(orbit.perigee_km, 529);
  assert.ok(orbit.orbital_period_minutes > 95);
  assert.ok(orbit.orbital_period_minutes < 96);
});

test("maker generates fixed-width TLE lines with valid checksums", () => {
  const orbit = deriveMakerOrbit(request);
  const tle = buildMakerTle(request, orbit);

  assert.equal(tle.line1.length, 69);
  assert.equal(tle.line2.length, 69);
  assert.equal(Number(tle.line1[68]), tleChecksum(tle.line1));
  assert.equal(Number(tle.line2[68]), tleChecksum(tle.line2));
});

test("maker limits comparison screening to twenty satellites", () => {
  const result = satelliteMakerRequestSchema.safeParse({
    ...request,
    comparison_norad_ids: Array.from({ length: 21 }, (_, index) => index + 1),
  });

  assert.equal(result.success, false);
});
