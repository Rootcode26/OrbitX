import type { GlobeObject } from "@/features/globe/types";
import type { DerivedOrbit, SatelliteDraftConfig } from "./types";

const earthRadiusKm = 6371;
const earthGravitationalParameter = 398600.4418;

export function deriveOrbit(config: SatelliteDraftConfig): DerivedOrbit {
  const semiMajorAxisKm = earthRadiusKm + config.altitudeKm;
  const apogeeKm = config.altitudeKm + config.apsisOffsetKm;
  const perigeeKm = config.altitudeKm - config.apsisOffsetKm;
  const eccentricity = config.apsisOffsetKm / semiMajorAxisKm;
  const periodSeconds = 2 * Math.PI * Math.sqrt(
    Math.pow(semiMajorAxisKm, 3) / earthGravitationalParameter,
  );
  const phaseRadians = config.phaseDegrees * Math.PI / 180;
  const currentRadiusKm = semiMajorAxisKm * (1 - eccentricity * eccentricity)
    / (1 + eccentricity * Math.cos(phaseRadians));
  const currentVelocityKmS = Math.sqrt(
    earthGravitationalParameter * (2 / currentRadiusKm - 1 / semiMajorAxisKm),
  );

  return {
    semiMajorAxisKm,
    apogeeKm,
    perigeeKm,
    eccentricity,
    orbitalPeriodMinutes: periodSeconds / 60,
    revolutionsPerDay: 86400 / periodSeconds,
    currentVelocityKmS,
    currentAltitudeKm: currentRadiusKm - earthRadiusKm,
    regime: config.altitudeKm < 2000 ? "LEO" : config.altitudeKm < 35786 ? "MEO" : "GEO",
  };
}

export function validateSatelliteDraft(config: SatelliteDraftConfig) {
  const errors: string[] = [];
  if (!config.objectName.trim()) errors.push("Object name is required.");
  if (!config.operator.trim()) errors.push("Operator is required.");
  if (!config.epochUtc) errors.push("Epoch is required.");
  if (config.altitudeKm - config.apsisOffsetKm < 160) errors.push("Perigee must remain at or above 160 km.");
  return errors;
}

export function toFeaturedGlobeObject(config: SatelliteDraftConfig, orbit: DerivedOrbit): GlobeObject {
  return {
    id: -1,
    name: config.objectName || "UNTITLED OBJECT",
    objectClass: "focused",
    orbitRadius: 1.12 + config.altitudeKm / 5000,
    inclination: config.inclinationDegrees,
    raan: config.raanDegrees,
    argumentOfPerigee: config.argumentOfPerigeeDegrees,
    eccentricity: Math.min(orbit.eccentricity * 8, 0.16),
    phase: config.phaseDegrees * Math.PI / 180,
    // True mean motion (radians per simulated second) from the real period.
    angularSpeed: (2 * Math.PI) / (Math.max(orbit.orbitalPeriodMinutes, 1) * 60),
  };
}
