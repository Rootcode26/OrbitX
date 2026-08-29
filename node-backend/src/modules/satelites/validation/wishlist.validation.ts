import { z } from "zod";

export const wishlistSatelliteParamsSchema = z.object({
  noradCatId: z.coerce.number().int().positive(),
}).strict();
