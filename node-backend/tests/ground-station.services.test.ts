import assert from "node:assert/strict";
import test from "node:test";
import { calculateElevationDegrees } from "../src/modules/satelites/services/ground-station.services.ts";
import type { SatelliteTrajectoryPoint } from "../src/modules/satelites/types.ts";

test("elevation is near zenith for a satellite directly above a station", () => {
  const timestamp = "2000-01-01T12:00:00Z";
  const julianDate = Date.parse(timestamp) / 86_400_000 + 2_440_587.5;
  const centuries = (julianDate - 2_451_545) / 36_525;
  const siderealDegrees = 280.46061837
    + 360.98564736629 * (julianDate - 2_451_545)
    + 0.000387933 * centuries ** 2
    - centuries ** 3 / 38_710_000;
  const siderealRadians = siderealDegrees * Math.PI / 180;
  const orbitalRadiusKm = 7_000;
  const point: SatelliteTrajectoryPoint = {
    norad_cat_id: 25544,
    timestamp_utc: timestamp,
    position_km: {
      x: Math.cos(siderealRadians) * orbitalRadiusKm,
      y: Math.sin(siderealRadians) * orbitalRadiusKm,
      z: 0,
    },
    velocity_km_s: { x: 0, y: 0, z: 0 },
  };

  const elevation = calculateElevationDegrees(point, {
    id: "equator",
    name: "Equatorial station",
    latitude_degrees: 0,
    longitude_degrees: 0,
    altitude_meters: 0,
  });

  assert.ok(elevation > 89.9);
});
