import type { ConjunctionRiskLevel } from "./types";

// Mirrors the backend's separation-based risk fallback
// (conjunction-event.services.ts) so proximity risk in the finder reads
// consistently with the Conjunctions page and screening results.
export function classifySeparationRisk(separationKm: number): ConjunctionRiskLevel {
  if (!Number.isFinite(separationKm) || separationKm < 0) return "LOW";
  if (separationKm < 1) return "CRITICAL";
  if (separationKm < 2.5) return "HIGH";
  if (separationKm < 10) return "MEDIUM";
  return "LOW";
}
