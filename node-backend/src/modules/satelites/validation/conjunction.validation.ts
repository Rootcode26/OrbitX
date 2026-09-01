import { z } from "zod";
import { CONJUNCTION_SCREENING_WINDOW_MINUTES } from "../../../constants/index.ts";

export const conjunctionCheckRequestSchema = z.object({
  satellite_a_norad_id: z.number().int().positive(),
  satellite_b_norad_id: z.number().int().positive(),
  start_time: z.string().datetime({ offset: true }).optional(),
  duration_minutes: z.number().int().min(1).max(CONJUNCTION_SCREENING_WINDOW_MINUTES).optional(),
  step_seconds: z.number().int().min(1).max(3_600).optional(),
  include_separation_profile: z.boolean().optional(),
}).strict().refine(
  (request) => request.satellite_a_norad_id !== request.satellite_b_norad_id,
  {
    message: "Satellite A and Satellite B must be different",
    path: ["satellite_b_norad_id"],
  },
);

export const satelliteFinderComparisonRequestSchema = z.object({
  primary_norad_id: z.number().int().positive(),
  comparison_norad_ids: z.array(z.number().int().positive()).min(1).max(20),
  start_time: z.string().datetime({ offset: true }).optional(),
  duration_minutes: z.number().int().min(1).max(CONJUNCTION_SCREENING_WINDOW_MINUTES).optional(),
  step_seconds: z.number().int().min(1).max(3_600).optional(),
  include_separation_profile: z.boolean().optional(),
}).strict()
  .refine(
    (request) => new Set(request.comparison_norad_ids).size === request.comparison_norad_ids.length,
    {
      message: "Comparison NORAD IDs must be unique",
      path: ["comparison_norad_ids"],
    },
  )
  .refine(
    (request) => !request.comparison_norad_ids.includes(request.primary_norad_id),
    {
      message: "Primary satellite cannot be included in comparison NORAD IDs",
      path: ["comparison_norad_ids"],
    },
  );
