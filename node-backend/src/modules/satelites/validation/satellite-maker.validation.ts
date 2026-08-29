import { z } from "zod";

export const satelliteMakerRequestSchema = z.object({
  object_name: z.string().trim().min(1).max(80),
  operator: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(80),
  object_type: z.enum(["PAYLOAD", "ROCKET_BODY", "DEBRIS"]),
  epoch_utc: z.string().datetime({ offset: true }),
  altitude_km: z.number().min(160).max(2_000),
  inclination_degrees: z.number().min(0).max(180),
  raan_degrees: z.number().min(0).lt(360),
  argument_of_perigee_degrees: z.number().min(0).lt(360),
  phase_degrees: z.number().min(0).lt(360),
  apsis_offset_km: z.number().min(0).max(500),
  bstar: z.number().min(-0.99999).max(0.99999),
  temporary_norad_id: z.number().int().min(90_000).max(99_999).default(90_000),
  comparison_norad_ids: z.array(z.number().int().positive()).max(20).default([]),
}).strict()
  .refine(
    (request) => request.altitude_km - request.apsis_offset_km >= 160,
    {
      message: "Perigee altitude must be at least 160 km",
      path: ["apsis_offset_km"],
    },
  )
  .refine(
    (request) => request.bstar === 0 || Math.abs(request.bstar) >= 1e-9,
    {
      message: "Non-zero B* must be at least 1e-9 in magnitude",
      path: ["bstar"],
    },
  )
  .refine(
    (request) => new Set(request.comparison_norad_ids).size === request.comparison_norad_ids.length,
    {
      message: "Comparison NORAD IDs must be unique",
      path: ["comparison_norad_ids"],
    },
  )
  .refine(
    (request) => !request.comparison_norad_ids.includes(request.temporary_norad_id),
    {
      message: "Temporary NORAD ID cannot be used as a comparison object",
      path: ["comparison_norad_ids"],
    },
  );
