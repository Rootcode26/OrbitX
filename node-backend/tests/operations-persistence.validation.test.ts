import assert from "node:assert/strict";
import test from "node:test";
import { alertCreateRequestSchema, alertListQuerySchema } from "../src/modules/satelites/validation/alert.validation.ts";
import { conjunctionAnalyticsQuerySchema, conjunctionEventListQuerySchema } from "../src/modules/satelites/validation/conjunction-event.validation.ts";
import { wishlistSatelliteParamsSchema } from "../src/modules/satelites/validation/wishlist.validation.ts";

test("alert validation applies queue defaults", () => {
  const query = alertListQuerySchema.parse({});
  assert.equal(query.status, "all");
  assert.equal(query.limit, 100);

  assert.equal(alertCreateRequestSchema.safeParse({
    severity: "CRITICAL",
    source: "CONJUNCTION_SCREENING",
    title: "Close approach",
    description: "Predicted separation below threshold",
  }).success, true);
});

test("conjunction history validates windows and analytics bounds", () => {
  assert.equal(conjunctionEventListQuerySchema.safeParse({
    from: "2026-08-29T00:00:00Z",
    to: "2026-08-28T00:00:00Z",
  }).success, false);
  assert.equal(conjunctionAnalyticsQuerySchema.parse({}).days, 14);
  assert.equal(conjunctionAnalyticsQuerySchema.safeParse({ days: 366 }).success, false);
});

test("wishlist parameters require a positive NORAD ID", () => {
  assert.equal(wishlistSatelliteParamsSchema.safeParse({
    noradCatId: "25544",
  }).success, true);
  assert.equal(wishlistSatelliteParamsSchema.safeParse({
    noradCatId: "not-a-number",
  }).success, false);
});
