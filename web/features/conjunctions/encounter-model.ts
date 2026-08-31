import type { ConjunctionEvent, EncounterTrackSample, SeparationSample, Vec3Data } from "./types";

// -------------------------------------------------------------------------
// Encounter model.
//
// When the backend supplies the exact TEME state vectors at TCA (and, ideally,
// a dense TCA-centered track), the geometry is built directly from real SGP4
// output: the true miss vector, the true relative velocity, and each object's
// true velocity direction — no assumptions.
//
// When those are absent (e.g. a list row without raw_result) it falls back to
// a rectilinear reconstruction from the scalar miss distance, relative velocity
// and encounter angle, using an equal-speed assumption only to orient the two
// velocity arrows.
// -------------------------------------------------------------------------

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface EncounterModel {
  hasGeometry: boolean;
  /** True when built from real TCA state vectors rather than reconstructed. */
  exact: boolean;
  /** True when a dense, real propagated track is available (curved paths). */
  hasTrack: boolean;
  /** Half-extent of the real track in minutes (view/sampling bound). */
  trackHalfMinutes: number;
  missKm: number;
  relativeVelocityKmS: number;
  encounterAngleDeg: number | null;
  radialUncertaintyKm: number | null;
  speedKmS: number;
  velocityA: Vec3;
  velocityB: Vec3;
  reconstructedVelocities: boolean;
  positionA: (minutes: number) => Vec3;
  positionB: (minutes: number) => Vec3;
  midpoint: (minutes: number) => Vec3;
  separationAt: (minutes: number) => number;
  closingRateAt: (minutes: number) => number;
  sampleMinutes: { minutes: number; separationKm: number; closingRateKmS: number | null }[];
}

// ---- vector helpers ------------------------------------------------------

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const norm = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
const normalize = (a: Vec3): Vec3 => {
  const length = norm(a);
  return length > 1e-12 ? scale(a, 1 / length) : { x: 0, y: 0, z: 0 };
};
const fromData = (value: Vec3Data): Vec3 => ({ x: value.x, y: value.y, z: value.z });

// Any unit vector orthogonal to the supplied unit vector.
function orthogonal(unit: Vec3): Vec3 {
  const reference: Vec3 = Math.abs(unit.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  return normalize(sub(reference, scale(unit, dot(reference, unit))));
}

export function magnitude(vector: Vec3) {
  return norm(vector);
}

// ---- sample utilities ----------------------------------------------------

function toSampleMinutes(profile: SeparationSample[], tcaMs: number) {
  if (!Number.isFinite(tcaMs)) return [];
  return profile
    .map((sample) => ({
      minutes: (new Date(sample.timestamp).getTime() - tcaMs) / 60000,
      separationKm: sample.separationKm,
      closingRateKmS: sample.closingRateKmS,
    }))
    .filter((sample) => Number.isFinite(sample.minutes))
    .sort((a, b) => a.minutes - b.minutes);
}

function interpolateScalar(
  samples: { minutes: number; value: number | null }[],
  minutes: number,
): number | null {
  if (samples.length === 0) return null;
  if (minutes <= samples[0].minutes) return samples[0].value;
  if (minutes >= samples[samples.length - 1].minutes) return samples[samples.length - 1].value;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (minutes <= current.minutes) {
      if (previous.value === null || current.value === null) return current.value ?? previous.value;
      const span = current.minutes - previous.minutes || 1;
      const ratio = (minutes - previous.minutes) / span;
      return previous.value + (current.value - previous.value) * ratio;
    }
  }
  return samples[samples.length - 1].value;
}

function interpolateVector(samples: { minutes: number; point: Vec3 }[], minutes: number): Vec3 {
  if (minutes <= samples[0].minutes) return samples[0].point;
  if (minutes >= samples[samples.length - 1].minutes) return samples[samples.length - 1].point;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (minutes <= current.minutes) {
      const span = current.minutes - previous.minutes || 1;
      const ratio = (minutes - previous.minutes) / span;
      return add(previous.point, scale(sub(current.point, previous.point), ratio));
    }
  }
  return samples[samples.length - 1].point;
}

// ---- exact model ---------------------------------------------------------

function buildExactModel(
  event: ConjunctionEvent,
  tcaMs: number,
  windowSamples: ReturnType<typeof toSampleMinutes>,
  missKm: number,
  radialUncertaintyKm: number | null,
): EncounterModel {
  const state = event.tcaState!;
  const positionAtca = fromData(state.a.positionKm);
  const positionBtca = fromData(state.b.positionKm);
  const velocityAtca = fromData(state.a.velocityKmS);
  const velocityBtca = fromData(state.b.velocityKmS);

  const relativePosition = sub(positionBtca, positionAtca);
  const relativeVelocity = sub(velocityBtca, velocityAtca);
  const relativeVelocityKmS = norm(relativeVelocity) || event.relativeVelocityKmS || 0;

  // Encounter-frame basis: ê_v along relative velocity, ê_m along the miss
  // vector (r_rel component perpendicular to ê_v), ê_n out of plane.
  const basisV = normalize(relativeVelocity);
  const missComponent = sub(relativePosition, scale(basisV, dot(relativePosition, basisV)));
  const basisM = norm(missComponent) > 1e-9 ? normalize(missComponent) : orthogonal(basisV);
  const basisN = cross(basisV, basisM);
  const origin = scale(add(positionAtca, positionBtca), 0.5);

  const project = (point: Vec3): Vec3 => {
    const delta = sub(point, origin);
    return { x: dot(delta, basisV), y: dot(delta, basisM), z: dot(delta, basisN) };
  };
  const projectDirection = (vector: Vec3): Vec3 =>
    normalize({ x: dot(vector, basisV), y: dot(vector, basisM), z: dot(vector, basisN) });

  const velocityA = projectDirection(velocityAtca);
  const velocityB = projectDirection(velocityBtca);

  const track = event.encounterTrack ?? [];
  const sortedTrack = [...track].sort((a, b) => a.offsetSeconds - b.offsetSeconds);
  const hasTrack = sortedTrack.length > 1;
  const projectedA = sortedTrack.map((sample: EncounterTrackSample) => ({
    minutes: sample.offsetSeconds / 60,
    point: project(fromData(sample.positionAKm)),
  }));
  const projectedB = sortedTrack.map((sample: EncounterTrackSample) => ({
    minutes: sample.offsetSeconds / 60,
    point: project(fromData(sample.positionBKm)),
  }));
  const trackSeparation = sortedTrack.map((sample: EncounterTrackSample) => ({
    minutes: sample.offsetSeconds / 60,
    value: sample.separationKm,
  }));
  const trackHalfMinutes = hasTrack
    ? Math.max(...sortedTrack.map((sample) => Math.abs(sample.offsetSeconds / 60)))
    : 10;
  const trackFirst = hasTrack ? projectedA[0].minutes : 0;
  const trackLast = hasTrack ? projectedA[projectedA.length - 1].minutes : 0;

  const positionA = (minutes: number): Vec3 => {
    if (hasTrack && minutes >= trackFirst && minutes <= trackLast) return interpolateVector(projectedA, minutes);
    return project(add(positionAtca, scale(velocityAtca, minutes * 60)));
  };
  const positionB = (minutes: number): Vec3 => {
    if (hasTrack && minutes >= trackFirst && minutes <= trackLast) return interpolateVector(projectedB, minutes);
    return project(add(positionBtca, scale(velocityBtca, minutes * 60)));
  };
  const midpoint = (minutes: number): Vec3 => scale(add(positionA(minutes), positionB(minutes)), 0.5);

  // Real dense track when available, otherwise the rectilinear model anchored
  // so that separation(0) is exactly the minimum. The coarse ±2h profile is
  // deliberately not used here: linear interpolation across the sharp minimum
  // overshoots and would disagree with the reported minimum separation.
  const analyticSeparation = (minutes: number) => Math.hypot(missKm, relativeVelocityKmS * minutes * 60);

  const separationAt = (minutes: number): number => {
    if (hasTrack && minutes >= trackFirst && minutes <= trackLast) {
      const value = interpolateScalar(trackSeparation, minutes);
      if (value !== null) return value;
    }
    return analyticSeparation(minutes);
  };

  const closingRateAt = (minutes: number): number => {
    if (hasTrack && minutes > trackFirst && minutes < trackLast) {
      const step = 0.05;
      return -(separationAt(minutes + step) - separationAt(minutes - step)) / (2 * step * 60);
    }
    const separation = analyticSeparation(minutes) || 1;
    return -(relativeVelocityKmS * relativeVelocityKmS * minutes * 60) / separation;
  };

  return {
    hasGeometry: relativeVelocityKmS > 0,
    exact: true,
    hasTrack,
    trackHalfMinutes,
    missKm,
    relativeVelocityKmS,
    encounterAngleDeg: event.encounterAngleDegrees,
    radialUncertaintyKm,
    speedKmS: relativeVelocityKmS,
    velocityA,
    velocityB,
    reconstructedVelocities: false,
    positionA,
    positionB,
    midpoint,
    separationAt,
    closingRateAt,
    sampleMinutes: windowSamples,
  };
}

// ---- reconstructed fallback ---------------------------------------------

function buildReconstructedModel(
  event: ConjunctionEvent,
  windowSamples: ReturnType<typeof toSampleMinutes>,
  missKm: number,
  radialUncertaintyKm: number | null,
): EncounterModel {
  const profileRelativeVelocity = windowSamples.reduce(
    (maximum, sample) => Math.max(maximum, Math.abs(sample.closingRateKmS ?? 0)),
    0,
  );
  const relativeVelocityKmS = event.relativeVelocityKmS ?? profileRelativeVelocity;
  const encounterAngleDeg = event.encounterAngleDegrees;

  let velocityA: Vec3 = { x: -1, y: 0, z: 0 };
  let velocityB: Vec3 = { x: 1, y: 0, z: 0 };
  let speedKmS = relativeVelocityKmS;
  let reconstructedVelocities = false;

  if (encounterAngleDeg !== null) {
    const half = (encounterAngleDeg * Math.PI) / 180 / 2;
    const sinHalf = Math.sin(half);
    const cosHalf = Math.cos(half);
    velocityA = { x: -sinHalf, y: cosHalf, z: 0 };
    velocityB = { x: sinHalf, y: cosHalf, z: 0 };
    speedKmS = sinHalf > 1e-4 ? relativeVelocityKmS / (2 * sinHalf) : relativeVelocityKmS;
    reconstructedVelocities = true;
  }

  const positionA = (minutes: number): Vec3 => scale(velocityA, speedKmS * minutes * 60);
  const positionB = (minutes: number): Vec3 => add({ x: 0, y: missKm, z: 0 }, scale(velocityB, speedKmS * minutes * 60));
  const midpoint = (minutes: number): Vec3 => scale(add(positionA(minutes), positionB(minutes)), 0.5);

  const analyticSeparation = (minutes: number) => Math.hypot(missKm, relativeVelocityKmS * minutes * 60);
  const separationAt = (minutes: number): number => analyticSeparation(minutes);
  const closingRateAt = (minutes: number): number => {
    const separation = analyticSeparation(minutes) || 1;
    return -(relativeVelocityKmS * relativeVelocityKmS * minutes * 60) / separation;
  };

  return {
    hasGeometry: relativeVelocityKmS > 0 && Number.isFinite(missKm),
    exact: false,
    hasTrack: false,
    trackHalfMinutes: 10,
    missKm,
    relativeVelocityKmS,
    encounterAngleDeg,
    radialUncertaintyKm,
    speedKmS,
    velocityA,
    velocityB,
    reconstructedVelocities,
    positionA,
    positionB,
    midpoint,
    separationAt,
    closingRateAt,
    sampleMinutes: windowSamples,
  };
}

export function buildEncounterModel(event: ConjunctionEvent): EncounterModel {
  const tcaMs = event.tcaIso ? new Date(event.tcaIso).getTime() : NaN;
  const windowSamples = toSampleMinutes(event.separationProfile, tcaMs);

  const sampledMinimum = windowSamples.reduce(
    (minimum, sample) => Math.min(minimum, sample.separationKm),
    Number.POSITIVE_INFINITY,
  );
  const missKm = event.minimumSeparationKm ?? (Number.isFinite(sampledMinimum) ? sampledMinimum : 0);
  const radialUncertaintyKm = event.radialUncertaintyM === null || event.radialUncertaintyM === undefined
    ? null
    : event.radialUncertaintyM / 1000;

  if (event.tcaState) {
    return buildExactModel(event, tcaMs, windowSamples, missKm, radialUncertaintyKm);
  }
  return buildReconstructedModel(event, windowSamples, missKm, radialUncertaintyKm);
}

/**
 * Recommended in-view half-extent (km) so both objects are framed with margin
 * at a given time offset. Uniform scaling keeps the geometry faithful.
 */
export function fitHalfKm(model: EncounterModel, minutes: number): number {
  const separation = model.separationAt(minutes);
  return Math.max(separation, model.missKm, 0.05) * 1.7;
}
