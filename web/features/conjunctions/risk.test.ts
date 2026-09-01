import assert from "node:assert/strict";
import test from "node:test";
import { classifySeparationRisk } from "./risk.ts";

test("classifies separation into the backend risk bands", () => {
  assert.equal(classifySeparationRisk(0.5), "CRITICAL");
  assert.equal(classifySeparationRisk(2), "HIGH");
  assert.equal(classifySeparationRisk(8), "MEDIUM");
  assert.equal(classifySeparationRisk(250), "LOW");
});

test("uses exclusive upper bounds at the band edges", () => {
  assert.equal(classifySeparationRisk(1), "HIGH");
  assert.equal(classifySeparationRisk(4.99), "HIGH");
  assert.equal(classifySeparationRisk(5), "MEDIUM");
  assert.equal(classifySeparationRisk(10), "LOW");
});

test("falls back to LOW for invalid separations", () => {
  assert.equal(classifySeparationRisk(Number.NaN), "LOW");
  assert.equal(classifySeparationRisk(-5), "LOW");
});
