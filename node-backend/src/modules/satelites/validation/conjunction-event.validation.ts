import { z } from "zod";

export const conjunctionEventListQuerySchema = z.object({
  risk_level: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "CLEAR"]).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  before: z.string().datetime({ offset: true }).optional(),
  upcoming: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  horizon_hours: z.coerce.number().int().min(1).max(168).default(168),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict().refine(
  (query) => !query.from || !query.to || Date.parse(query.from) <= Date.parse(query.to),
  {
    message: "Conjunction event start time cannot exceed end time",
    path: ["to"],
  },
);

export const conjunctionEventParamsSchema = z.object({
  eventId: z.string().uuid(),
}).strict();

export const conjunctionAnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(14),
}).strict();
