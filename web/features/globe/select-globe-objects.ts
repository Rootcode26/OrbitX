import type { GlobeObject } from "./types";

export interface GlobeObjectQuota {
  total: number;
  satellites: number;
  debris: number;
  rocketBodies: number;
}

// Overview and Live Tracking render a curated slice of the propagated catalog so
// the globe stays readable. We aim for a payload-heavy mix; when a class is
// short, the remaining slots are backfilled from whatever objects are left over.
export const OVERVIEW_GLOBE_QUOTA: GlobeObjectQuota = {
  total: 50,
  satellites: 37,
  debris: 8,
  rocketBodies: 2,
};

function isSatellite(object: GlobeObject) {
  return object.objectClass === "active" || object.objectClass === "inactive";
}

function uniqueObjects(objects: GlobeObject[]) {
  return Array.from(new Map(objects.map((object) => [object.id, object])).values());
}

export function selectGlobeObjectsByQuota(
  objects: GlobeObject[],
  quota: GlobeObjectQuota = OVERVIEW_GLOBE_QUOTA,
  pinnedIds?: Iterable<number>,
): GlobeObject[] {
  const candidates = uniqueObjects(objects);
  const byId = new Map(candidates.map((object) => [object.id, object]));
  const selected = new Map<number, GlobeObject>();

  // Always keep explicitly pinned objects (e.g. the satellite being inspected)
  // so the selection survives the periodic state refetch.
  for (const id of pinnedIds ?? []) {
    const object = byId.get(id);
    if (object) selected.set(object.id, object);
  }

  const takeUpTo = (matches: (object: GlobeObject) => boolean, count: number) => {
    let taken = candidates.filter((object) => selected.has(object.id) && matches(object)).length;
    for (const object of candidates) {
      if (taken >= count) break;
      if (!selected.has(object.id) && matches(object)) {
        selected.set(object.id, object);
        taken += 1;
      }
    }
  };

  takeUpTo(isSatellite, quota.satellites);
  takeUpTo((object) => object.objectClass === "debris", quota.debris);
  takeUpTo((object) => object.objectClass === "rocket", quota.rocketBodies);

  // Backfill any remaining slots from the leftover objects, regardless of class,
  // so the total is met even when a class is under-represented.
  for (const object of candidates) {
    if (selected.size >= quota.total) break;
    if (!selected.has(object.id)) selected.set(object.id, object);
  }

  return Array.from(selected.values()).slice(0, quota.total);
}
