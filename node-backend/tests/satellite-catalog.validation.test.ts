import assert from "node:assert/strict";
import test from "node:test";
import { satelliteCatalogQuerySchema } from "../src/modules/satelites/validation/satellite-catalog.validation.ts";

test("catalog query applies stable pagination and sorting defaults", () => {
  const query = satelliteCatalogQuerySchema.parse({});

  assert.deepEqual(query, {
    page: 1,
    page_size: 10,
    sort: "name",
    direction: "asc",
  });
});

test("catalog query rejects an inverted altitude range", () => {
  const result = satelliteCatalogQuerySchema.safeParse({
    minimum_altitude_km: "900",
    maximum_altitude_km: "400",
  });

  assert.equal(result.success, false);
});
