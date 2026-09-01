import { z } from "zod";
import { CONJUNCTION_SCREENING_WINDOW_MINUTES } from "../../../constants/index.ts";

const MAX_TRAJECTORY_SAMPLES = 145;

const trajectoryFields = {
  norad_cat_id: z.number().int().positive(),
  start_time: z.string().datetime({ offset: true }).default(() => new Date().toISOString()),
  duration_minutes: z.number().int().min(1).max(1_440).default(1_440),
  step_seconds: z.number().int().min(60).max(3_600).default(600),
};

const hasSupportedSampleCount = (request: { duration_minutes: number; step_seconds: number }) => Math.ceil((request.duration_minutes * 60) / request.step_seconds) + 1 <= MAX_TRAJECTORY_SAMPLES;

export const satelliteTrajectoryRequestSchema = z.object(trajectoryFields).strict().refine(hasSupportedSampleCount, {
  message: `Trajectory requests may contain at most ${MAX_TRAJECTORY_SAMPLES} samples`,
  path: ["step_seconds"],
});

const groundStationSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(100),
  latitude_degrees: z.number().min(-90).max(90),
  longitude_degrees: z.number().min(-180).max(180),
  altitude_meters: z.number().min(-500).max(10_000).default(0),
}).strict();

export const groundStationPassRequestSchema = z.object({
  ...trajectoryFields,
  minimum_elevation_degrees: z.number().min(0).max(90).default(10),
  stations: z.array(groundStationSchema).min(1).max(10),
}).strict().refine(hasSupportedSampleCount, {
  message: `Ground-station pass requests may contain at most ${MAX_TRAJECTORY_SAMPLES} propagation samples`,
  path: ["step_seconds"],
}).refine(
  (request) => new Set(request.stations.map((station) => station.id)).size === request.stations.length,
  {
    message: "Ground-station IDs must be unique",
    path: ["stations"],
  },
);

export const satelliteConjunctionScreenRequestSchema = z.object({
  primary_norad_id: z.number().int().positive(),
  candidate_limit: z.number().int().min(1).max(20).default(20),
  start_time: z.string().datetime({ offset: true }).optional(),
  duration_minutes: z.number().int().min(1).max(CONJUNCTION_SCREENING_WINDOW_MINUTES).optional(),
  step_seconds: z.number().int().min(1).max(3_600).optional(),
  include_separation_profile: z.boolean().optional(),
}).strict();
