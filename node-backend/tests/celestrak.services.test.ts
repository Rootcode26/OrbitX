import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchTleData,
  parseSatcatData,
  parseTleData,
} from "../src/modules/satelites/services/celestrak.services.ts";

test("parseSatcatData maps the CelesTrak SATCAT fields", () => {
  const records = parseSatcatData([{
    OBJECT_NAME: "ISS (ZARYA)",
    NORAD_CAT_ID: "25544",
    OBJECT_TYPE: "PAY",
    OPS_STATUS_CODE: "+",
    OWNER: "ISS",
    LAUNCH_DATE: "1998-11-20",
    LAUNCH_SITE: "TTMTR",
    DECAY_DATE: null,
    OBJECT_ID: "1998-067A",
    RCS: "399.0524",
    DATA_STATUS_CODE: "NIE",
    ORBIT_CENTER: "EA",
    ORBIT_TYPE: "ORB",
    PERIOD: "92.90",
    INCLINATION: "51.63",
    APOGEE: "423",
    PERIGEE: "417",
  }]);

  assert.equal(records.length, 1);
  assert.deepEqual(records[0], {
    noradCatId: 25544,
    satelliteName: "ISS (ZARYA)",
    objectType: "PAY",
    owner: "ISS",
    operationalStatus: "+",
    launchDate: "1998-11-20",
    launchSite: "TTMTR",
    decayDate: null,
    internationalDesignator: "1998-067A",
    radarCrossSection: 399.0524,
    dataStatusCode: "NIE",
    orbitCenter: "EA",
    orbitType: "ORB",
    orbitalPeriodMinutes: 92.9,
    inclinationDegrees: 51.63,
    apogeeKm: 423,
    perigeeKm: 417,
  });
});

test("parseTleData parses a three-line element record", () => {
  const records = parseTleData([
    "ISS (ZARYA)",
    "1 25544U 98067A   26235.72586232  .00009235  00000+0  17193-3 0  9995",
    "2 25544  51.6333 325.8142 0007700  76.3746 283.8100 15.49592931582224",
  ].join("\n"));

  assert.equal(records.length, 1);
  assert.equal(records[0]?.noradCatId, 25544);
  assert.equal(records[0]?.satelliteName, "ISS (ZARYA)");
  assert.match(records[0]?.epoch ?? "", /^2026-08-23T/);
  assert.equal(records[0]?.inclinationDegrees, 51.6333);
  assert.ok((records[0]?.orbitalPeriodMinutes ?? 0) > 90);
});

test("fetchTleData treats a 403 response as cached data", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  globalThis.fetch = async (input) => {
    requestedUrls.push(String(input));
    return new Response("Data has not changed", { status: 403 });
  };

  try {
    const result = await fetchTleData();
    assert.equal(result.state, "cached");
    assert.equal(result.httpStatus, 403);
    assert.deepEqual(result.records, []);
    assert.equal(requestedUrls.length, 4);
    assert.ok(requestedUrls.some((url) => url.includes("GROUP=FENGYUN-1C-DEBRIS")));
    assert.ok(requestedUrls.some((url) => url.includes("GROUP=IRIDIUM-33-DEBRIS")));
    assert.ok(requestedUrls.some((url) => url.includes("GROUP=COSMOS-2251-DEBRIS")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchTleData merges groups and removes duplicate NORAD records", async () => {
  const originalFetch = globalThis.fetch;
  const payload = [
    "ISS (ZARYA)",
    "1 25544U 98067A   26235.72586232  .00009235  00000+0  17193-3 0  9995",
    "2 25544  51.6333 325.8142 0007700  76.3746 283.8100 15.49592931582224",
  ].join("\n");
  globalThis.fetch = async () => new Response(payload, { status: 200 });

  try {
    const result = await fetchTleData();
    assert.equal(result.state, "fresh");
    assert.equal(result.records.length, 1);
    assert.equal(result.records[0]?.noradCatId, 25544);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
