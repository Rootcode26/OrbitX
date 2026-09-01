import {
  CONJUNCTION_ALERT_MAX_SEPARATION_KM,
  CONJUNCTION_DEFAULT_SCREENING_MINUTES,
} from "../../../constants/index.ts";
import {
  findConjunctionAnalytics,
  findConjunctionEventById,
  findConjunctionEvents,
  insertConjunctionEvent,
} from "../repositories/conjunction-event.repository.ts";
import {
  ConjunctionAnalytics,
  ConjunctionCheckRequest,
  ConjunctionCheckResponse,
  ConjunctionEventDatabaseRow,
  ConjunctionEventListQuery,
  ConjunctionEventPage,
  ConjunctionEventRecord,
  ConjunctionEventWrite,
  ConjunctionRiskLevel,
} from "../types.ts";

export class ConjunctionEventNotFoundError extends Error {
  constructor(public readonly eventId: string) {
    super(`Conjunction event ${eventId} was not found`);
    this.name = "ConjunctionEventNotFoundError";
  }
}

const readPath = (value: unknown, path: string): unknown => path.split(".").reduce<unknown>((current, key) => {
  if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
  return (current as Record<string, unknown>)[key];
}, value);

const readNumber = (result: ConjunctionCheckResponse, paths: string[]): number | null => {
  for (const path of paths) {
    const value = readPath(result, path);
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
};

const readString = (result: ConjunctionCheckResponse, paths: string[]): string | null => {
  for (const path of paths) {
    const value = readPath(result, path);
    if (typeof value === "string" && value.trim().length > 0) return value;
  }

  return null;
};

const readArray = (result: ConjunctionCheckResponse, paths: string[]): unknown[] | null => {
  for (const path of paths) {
    const value = readPath(result, path);
    if (Array.isArray(value)) return value;
  }

  return null;
};

const validTimestamp = (value: string | null, fallback: string | null): string | null => {
  if (value && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
  if (fallback && Number.isFinite(Date.parse(fallback))) return new Date(fallback).toISOString();
  return null;
};

const deriveRiskLevel = (result: ConjunctionCheckResponse, riskScore: number | null, minimumSeparationKm: number | null): ConjunctionRiskLevel => {
  const explicitRisk = readString(result, ["risk_level", "risk", "verdict.risk_level", "data.risk_level"])?.toUpperCase();

  if (explicitRisk && ["CRITICAL", "HIGH", "MEDIUM", "LOW", "CLEAR"].includes(explicitRisk)) {
    // A close approach cannot be clear. Some provider responses carry a default
    // CLEAR verdict while still returning the measured separation; use the
    // same distance bands as the fallback classifier for those contradictions.
    if (explicitRisk === "CLEAR" && minimumSeparationKm !== null && minimumSeparationKm <= 500) {
      if (minimumSeparationKm < 1) return "CRITICAL";
      if (minimumSeparationKm < 5) return "HIGH";
      if (minimumSeparationKm < 10) return "MEDIUM";
      return "LOW";
    }
    return explicitRisk as ConjunctionRiskLevel;
  }

  if (riskScore !== null) {
    if (riskScore >= 80) return "CRITICAL";
    if (riskScore >= 60) return "HIGH";
    if (riskScore >= 40) return "MEDIUM";
    if (riskScore > 0) return "LOW";
  }

  if (minimumSeparationKm !== null) {
    if (minimumSeparationKm < 1) return "CRITICAL";
    if (minimumSeparationKm < 5) return "HIGH";
    if (minimumSeparationKm < 10) return "MEDIUM";
    return "LOW";
  }

  return "CLEAR";
};

export const normalizeConjunctionResult = (request: ConjunctionCheckRequest, result: ConjunctionCheckResponse): ConjunctionEventWrite => {
  const minimumSeparationKm = readNumber(result, [
    "minimum_separation_km",
    "minimum_distance_km",
    "miss_distance_km",
    "closest_approach.separation_km",
    "data.minimum_separation_km",
  ]);
  const minimumSeparationMeters = readNumber(result, [
    "minimum_separation_m",
    "minimum_distance_m",
    "miss_distance_m",
    "closest_approach.separation_m",
  ]);
  const normalizedMinimumSeparationKm = minimumSeparationKm ?? (minimumSeparationMeters === null ? null : minimumSeparationMeters / 1_000);
  const riskScore = readNumber(result, ["risk_score", "score", "verdict.risk_score", "data.risk_score"]);
  const computedAt = validTimestamp(readString(result, [
    "computed_at",
    "computed_at_utc",
    "calculated_at",
    "prediction_time_utc",
    "data.computed_at",
  ]), new Date().toISOString())!;

  return {
    object_a_norad_id: request.satellite_a_norad_id,
    object_b_norad_id: request.satellite_b_norad_id,
    screening_started_at: request.start_time ?? computedAt,
    screening_duration_minutes: request.duration_minutes ?? CONJUNCTION_DEFAULT_SCREENING_MINUTES,
    screening_step_seconds: request.step_seconds ?? 60,
    computed_at: computedAt,
    tca: validTimestamp(readString(result, [
      "tca",
      "tca_utc",
      "time_of_closest_approach",
      "closest_approach_time_utc",
      "closest_approach.time_utc",
      "data.tca",
    ]), null),
    minimum_separation_km: normalizedMinimumSeparationKm,
    relative_velocity_km_s: readNumber(result, [
      "relative_velocity_km_s",
      "relative_speed_km_s",
      "closest_approach.relative_velocity_km_s",
      "data.relative_velocity_km_s",
    ]),
    collision_probability: readNumber(result, [
      "collision_probability",
      "probability_of_collision",
      "pc",
      "data.collision_probability",
    ]),
    risk_score: riskScore,
    risk_level: deriveRiskLevel(result, riskScore, normalizedMinimumSeparationKm),
    encounter_angle_degrees: readNumber(result, [
      "encounter_angle_degrees",
      "encounter_angle",
      "closest_approach.encounter_angle_degrees",
      "data.encounter_angle_degrees",
    ]),
    radial_uncertainty_m: readNumber(result, [
      "radial_uncertainty_m",
      "uncertainty.radial_m",
      "data.radial_uncertainty_m",
    ]),
    separation_profile: readArray(result, [
      "separation_profile",
      "separation_samples",
      "profile",
      "data.separation_profile",
      "data.separation_samples",
    ]),
    raw_result: result,
  };
};

const toConjunctionEventRecord = (row: ConjunctionEventDatabaseRow): ConjunctionEventRecord => ({
  id: row.id,
  object_a: { norad_cat_id: row.object_a_norad_id, name: row.object_a_name },
  object_b: { norad_cat_id: row.object_b_norad_id, name: row.object_b_name },
  screening_started_at: row.screening_started_at.toISOString(),
  screening_duration_minutes: row.screening_duration_minutes,
  screening_step_seconds: row.screening_step_seconds,
  computed_at: row.computed_at.toISOString(),
  tca: row.tca?.toISOString() ?? null,
  minimum_separation_km: row.minimum_separation_km,
  relative_velocity_km_s: row.relative_velocity_km_s,
  collision_probability: row.collision_probability,
  risk_score: row.risk_score,
  risk_level: row.risk_level,
  encounter_angle_degrees: row.encounter_angle_degrees,
  radial_uncertainty_m: row.radial_uncertainty_m,
  separation_profile: row.separation_profile,
  raw_result: row.raw_result,
});

export const qualifiesForConjunctionAlert = (event: ConjunctionEventWrite): boolean => (
  event.minimum_separation_km !== null
    && event.minimum_separation_km <= CONJUNCTION_ALERT_MAX_SEPARATION_KM
    && event.risk_level !== "CLEAR"
);

export const recordConjunctionResult = async (request: ConjunctionCheckRequest, result: ConjunctionCheckResponse): Promise<string> => {
  const event = normalizeConjunctionResult(request, result);
  const distance = event.minimum_separation_km === null ? "an unknown distance" : `${event.minimum_separation_km.toFixed(2)} km`;
  const alert = qualifiesForConjunctionAlert(event) ? {
    title: `${event.risk_level.toLowerCase()} conjunction detected`,
    description: `NORAD ${event.object_a_norad_id} and NORAD ${event.object_b_norad_id} have a predicted minimum separation of ${distance}.`,
  } : null;

  return insertConjunctionEvent(event, alert);
};

export const getConjunctionEventPage = async (query: ConjunctionEventListQuery): Promise<ConjunctionEventPage> => {
  const rows = await findConjunctionEvents(query);
  const hasMore = rows.length > query.limit;
  const events = rows.slice(0, query.limit).map(toConjunctionEventRecord);

  return {
    events,
    page: {
      limit: query.limit,
      has_more: hasMore,
      next_cursor: hasMore ? events.at(-1)?.computed_at ?? null : null,
    },
  };
};

export const getConjunctionEvent = async (eventId: string): Promise<ConjunctionEventRecord> => {
  const row = await findConjunctionEventById(eventId);
  if (!row) throw new ConjunctionEventNotFoundError(eventId);
  return toConjunctionEventRecord(row);
};

export const getConjunctionAnalytics = async (windowDays: number): Promise<ConjunctionAnalytics> => {
  const data = await findConjunctionAnalytics(windowDays);

  return {
    window_days: windowDays,
    total_events: data.totalEvents,
    events_over_time: data.daily,
    miss_distance_distribution: data.missDistances,
    risk_distribution: data.risks,
    upcoming_events: data.upcoming.map(toConjunctionEventRecord),
  };
};
