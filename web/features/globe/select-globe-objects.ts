import type { GlobeObject, GlobeObjectClass } from "./types";

const satelliteClasses: GlobeObjectClass[] = ["active", "inactive", "rocket"];

function uniqueObjects(objects: GlobeObject[]) {
  return Array.from(new Map(objects.map((object) => [object.id, object])).values());
}

export function selectBalancedGlobeObjects(currentObjects: GlobeObject[], satelliteCount = 7, debrisCount = 3) {
  const candidates = uniqueObjects(currentObjects);
  const satellites: GlobeObject[] = [];

  satelliteClasses.forEach((objectClass) => {
    const candidate = candidates.find((object) => object.objectClass === objectClass);
    if (candidate) satellites.push(candidate);
  });

  candidates.forEach((object) => {
    if (satellites.length >= satelliteCount) return;
    if (object.objectClass !== "debris" && !satellites.some((satellite) => satellite.id === object.id)) {
      satellites.push(object);
    }
  });

  const debris = candidates
    .filter((object) => object.objectClass === "debris")
    .slice(0, debrisCount);

  return [...satellites.slice(0, satelliteCount), ...debris];
}
