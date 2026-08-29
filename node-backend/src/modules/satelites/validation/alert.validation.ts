import { z } from "zod";

export const alertCreateRequestSchema = z.object({
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  source: z.enum(["CONJUNCTION_SCREENING", "ORBIT_DATA", "PROPAGATION", "CATALOG_SYNC", "SYSTEM"]),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(1_000),
  conjunction_event_id: z.string().uuid().optional(),
}).strict();

export const alertListQuerySchema = z.object({
  source: z.enum(["CONJUNCTION_SCREENING", "ORBIT_DATA", "PROPAGATION", "CATALOG_SYNC", "SYSTEM"])
    .default("CONJUNCTION_SCREENING"),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  status: z.enum(["all", "unacknowledged", "acknowledged", "resolved"]).default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(100),
}).strict();

export const alertParamsSchema = z.object({
  alertId: z.string().uuid(),
}).strict();
