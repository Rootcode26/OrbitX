import { z } from "zod";

export const satelliteCatalogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).max(100).optional(),
  object_type: z.enum(["PAY", "R/B", "DEB", "UNK"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  owner: z.string().trim().min(1).max(100).optional(),
  minimum_altitude_km: z.coerce.number().min(0).optional(),
  maximum_altitude_km: z.coerce.number().min(0).optional(),
  sort: z.enum(["name", "altitude", "inclination", "speed"]).default("name"),
  direction: z.enum(["asc", "desc"]).default("asc"),
}).strict().refine(
  (query) => (
    query.minimum_altitude_km === undefined
    || query.maximum_altitude_km === undefined
    || query.minimum_altitude_km <= query.maximum_altitude_km
  ),
  {
    message: "Minimum altitude cannot exceed maximum altitude",
    path: ["maximum_altitude_km"],
  },
);
