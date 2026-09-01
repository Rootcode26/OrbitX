export const EARTH_RADIUS_KM = 6_371;

// The globe is a visualization, so the altitude component is expanded while
// the Earth remains radius 1. This preserves every object's relative altitude
// instead of assigning arbitrary scene radii object by object.
const OPERATIONAL_ALTITUDE_SCALE = 2;

export function orbitRadiusFromAltitudeKm(altitudeKm: number) {
  return 1 + Math.max(altitudeKm, 0) / EARTH_RADIUS_KM;
}

export function expandOrbitRadius(physicalRadius: number) {
  return 1 + Math.max(physicalRadius - 1, 0) * OPERATIONAL_ALTITUDE_SCALE;
}
