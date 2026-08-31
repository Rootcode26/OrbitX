import assert from "node:assert/strict";
import test from "node:test";
import {
  nearbySatelliteQuerySchema,
  satelliteHistoryQuerySchema,
  satelliteNoradParamsSchema,
  satelliteStateListQuerySchema,
} from "../src/modules/satelites/validation/satellite-read.validation.ts";

test("nearby satellite queries apply pagination defaults", () => {
  assert.deepEqual(nearbySatelliteQuerySchema.parse({}), { page: 1, page_size: 10 });
});

test("nearby satellite queries reject oversized pages", () => {
  assert.equal(nearbySatelliteQuerySchema.safeParse({ page_size: "101" }).success, false);
});

test("state query defaults to the supported propagation batch size", () => {
  const result = satelliteStateListQuerySchema.parse({});

  assert.equal(result.limit, 100);
});

test("state query rejects limits above 100", () => {
  const result = satelliteStateListQuerySchema.safeParse({ limit: "101" });

  assert.equal(result.success, false);
});

test("NORAD path parameters are coerced to positive integers", () => {
  const result = satelliteNoradParamsSchema.parse({ noradCatId: "25544" });

  assert.equal(result.noradCatId, 25544);
  assert.equal(
    satelliteNoradParamsSchema.safeParse({ noradCatId: "0" }).success,
    false,
  );
});

test("history query accepts an ISO cursor and applies its default limit", () => {
  const result = satelliteHistoryQuerySchema.parse({
    before: "2026-08-28T10:00:00Z",
  });

  assert.equal(result.limit, 100);
  assert.equal(result.before, "2026-08-28T10:00:00Z");
});
