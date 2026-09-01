import assert from "node:assert/strict";
import test from "node:test";
import {
  OVERVIEW_GLOBE_QUOTA,
  selectGlobeObjectsByQuota,
} from "./select-globe-objects.ts";
import type { GlobeObject, GlobeObjectClass } from "./types.ts";

let nextId = 1;

function make(objectClass: GlobeObjectClass, count: number): GlobeObject[] {
  return Array.from({ length: count }, () => ({ id: nextId++, objectClass }) as GlobeObject);
}

function countBy(objects: GlobeObject[]) {
  return objects.reduce<Record<string, number>>((tally, object) => {
    const key = object.objectClass === "active" || object.objectClass === "inactive"
      ? "satellites"
      : object.objectClass;
    tally[key] = (tally[key] ?? 0) + 1;
    return tally;
  }, {});
}

test("hits the exact 37 / 8 / 2 mix when every class is plentiful", () => {
  const objects = [...make("active", 70), ...make("debris", 25), ...make("rocket", 5)];
  const selected = selectGlobeObjectsByQuota(objects);

  assert.equal(selected.length, OVERVIEW_GLOBE_QUOTA.total);
  assert.deepEqual(countBy(selected), { satellites: 40, debris: 8, rocket: 2 });
});

test("counts inactive payloads as satellites", () => {
  const objects = [...make("inactive", 50), ...make("debris", 25), ...make("rocket", 5)];
  const counts = countBy(selectGlobeObjectsByQuota(objects));
  assert.equal(counts.satellites, 40);
});

test("backfills from other classes when a class is short", () => {
  // Only 3 debris available -> the 5 missing debris slots plus the leftover
  // total are backfilled from the abundant payloads.
  const objects = [...make("active", 70), ...make("debris", 3), ...make("rocket", 2)];
  const selected = selectGlobeObjectsByQuota(objects);
  const counts = countBy(selected);

  assert.equal(selected.length, 50);
  assert.equal(counts.debris, 3);
  assert.equal(counts.rocket, 2);
  assert.equal(counts.satellites, 45);
});

test("never exceeds the available objects", () => {
  const objects = [...make("active", 10), ...make("debris", 4)];
  const selected = selectGlobeObjectsByQuota(objects);
  assert.equal(selected.length, 14);
});

test("keeps pinned objects even when they fall outside the quota", () => {
  const satellites = make("active", 70);
  const pinned = satellites[69];
  const objects = [...satellites, ...make("debris", 25), ...make("rocket", 5)];

  const selected = selectGlobeObjectsByQuota(objects, undefined, [pinned.id]);
  assert.equal(selected.length, 50);
  assert.ok(selected.some((object) => object.id === pinned.id));
});

test("deduplicates repeated objects before selecting", () => {
  const satellites = make("active", 5);
  const selected = selectGlobeObjectsByQuota([...satellites, ...satellites]);
  assert.equal(selected.length, 5);
});
