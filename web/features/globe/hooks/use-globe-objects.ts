"use client";

import { useMemo } from "react";
import { useCommissionedSatellites } from "@/features/satellite-maker/hooks/use-satellite-maker";
import type { SavedMakerSatellite } from "@/features/satellite-maker/api";
import type { GlobeObject } from "../types";

const degreesToRadians = Math.PI / 180;

function toGlobeObject(satellite: SavedMakerSatellite): GlobeObject {
  const altitudeKm = satellite.altitude_km ?? 500;
  const periodMinutes = satellite.orbital_period_minutes ?? 95;
  const objectClass: GlobeObject["objectClass"] = satellite.object_type === "DEBRIS"
    ? "debris"
    : satellite.object_type === "ROCKET_BODY"
      ? "rocket"
      : "active";

  return {
    id: satellite.norad_cat_id,
    name: satellite.name,
    objectClass,
    orbitRadius: Math.min(1.8, 1.12 + altitudeKm / 5000),
    inclination: satellite.inclination_degrees ?? 0,
    raan: satellite.raan_degrees,
    argumentOfPerigee: satellite.argument_of_perigee_degrees,
    eccentricity: Math.min(satellite.eccentricity * 8, 0.16),
    phase: satellite.phase_degrees * degreesToRadians,
    // True mean motion (radians per simulated second) from the real period.
    angularSpeed: (2 * Math.PI) / (Math.max(periodMinutes, 1) * 60),
  };
}

export function useGlobeObjects(baseObjects: GlobeObject[], featuredObjectId?: number) {
  const commissionedSatellites = useCommissionedSatellites();

  return useMemo(() => {
    const existingIds = new Set(baseObjects.map((object) => object.id));
    const userObjects = (commissionedSatellites.data ?? [])
      .filter((satellite) => satellite.norad_cat_id !== featuredObjectId && !existingIds.has(satellite.norad_cat_id))
      .map(toGlobeObject);

    return {
      objects: [...baseObjects, ...userObjects],
      userObjectIds: userObjects.map((object) => object.id),
    };
  }, [baseObjects, commissionedSatellites.data, featuredObjectId]);
}
