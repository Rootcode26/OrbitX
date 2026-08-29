import { z } from "zod";

export const satelliteStateListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
}).strict();

export const satelliteNoradParamsSchema = z.object({
  noradCatId: z.coerce.number().int().positive(),
}).strict();

export const satelliteHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  before: z.string().datetime({ offset: true }).optional(),
}).strict();
