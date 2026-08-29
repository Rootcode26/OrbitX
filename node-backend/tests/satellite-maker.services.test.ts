import assert from "node:assert/strict";
import test from "node:test";
import { previewSatellite } from "../src/modules/satelites/services/satellite-maker.services.ts";
import { satelliteMakerRequestSchema } from "../src/modules/satelites/validation/satellite-maker.validation.ts";

test("maker preview combines propagation and current-state responses", async (context) => {
  const originalFetch = globalThis.fetch;
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

  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url.endsWith("/propagation")) {
      return Response.json({
        prediction_time_utc: request.epoch_utc,
        reference_frame: "TEME",
        results: [{
          norad_cat_id: request.temporary_norad_id,
          position_km: { x: 1, y: 2, z: 3 },
          velocity_km_s: { x: 4, y: 5, z: 6 },
        }],
        errors: [],
      });
    }

    return Response.json({
      observation_time_utc: request.epoch_utc,
      results: [{
        norad_cat_id: request.temporary_norad_id,
        tle_epoch: request.epoch_utc,
        current_speed_km_s: 7.58,
        current_height_km: 552,
        latitude_degrees: 12,
        longitude_degrees: 45,
        apogee_height_km: 575,
        perigee_height_km: 529,
        orbital_period_minutes: 95.7,
        inclination_degrees: 53.2,
        raan_degrees: 128,
        revolution_number: 0,
      }],
      errors: [],
    });
  };

  const preview = await previewSatellite(request);

  assert.equal(preview.satellite.name, "AURORA-1");
  assert.equal(preview.state.reference_frame, "TEME");
  assert.equal(preview.state.current.current_height_km, 552);
  assert.deepEqual(preview.conjunctions, []);
});
