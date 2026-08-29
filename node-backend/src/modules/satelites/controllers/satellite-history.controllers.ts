import { NextFunction, Request, Response } from "express";
import { getSatelliteHistory } from "../services/satellite-history.services.ts";
import { SatelliteNotFoundError } from "../services/satellite-read.errors.ts";
import {
  satelliteHistoryQuerySchema,
  satelliteNoradParamsSchema,
} from "../validation/satellite-read.validation.ts";

export const getSatelliteHistoryRecords = async (req: Request, res: Response, next: NextFunction) => {
  const params = satelliteNoradParamsSchema.safeParse(req.params);
  const query = satelliteHistoryQuerySchema.safeParse(req.query);

  if (!params.success || !query.success) {
    return res.status(400).json({
      error: "Invalid satellite history request",
      issues: [
        ...(params.success ? [] : params.error.issues),
        ...(query.success ? [] : query.error.issues),
      ],
    });
  }

  try {
    const history = await getSatelliteHistory(
      params.data.noradCatId,
      query.data.limit,
      query.data.before,
    );

    return res.status(200).json({ data: history });
  } catch (error) {
    if (error instanceof SatelliteNotFoundError) {
      return res.status(404).json({
        error: error.message,
        norad_cat_id: error.noradCatId,
      });
    }

    return next(error);
  }
};
