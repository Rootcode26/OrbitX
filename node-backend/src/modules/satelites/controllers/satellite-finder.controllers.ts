import { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../../../auth/types.ts";
import {
  compareSatelliteFinderObjects,
  screenSatelliteConjunctionCandidates,
} from "../services/satellite-finder.services.ts";
import { SatelliteTleNotFoundError } from "../services/satelites-conjuction.services.ts";
import { satelliteFinderComparisonRequestSchema } from "../validation/conjunction.validation.ts";
import { satelliteConjunctionScreenRequestSchema } from "../validation/satellite-operations.validation.ts";

export const compareSatelliteFinderSelection = async (req: Request, res: Response, next: NextFunction) => {
  const request = satelliteFinderComparisonRequestSchema.safeParse(req.body);

  if (!request.success) {
    return res.status(400).json({
      error: "Invalid Satellite Finder comparison request",
      issues: request.error.issues,
    });
  }

  try {
    const result = await compareSatelliteFinderObjects(request.data);
    return res.status(200).json({ data: result });
  } catch (error) {
    if (error instanceof SatelliteTleNotFoundError) {
      return res.status(404).json({
        error: error.message,
        missing_norad_ids: error.noradCatIds,
      });
    }

    return next(error);
  }
};

export const screenSatelliteFinderCandidates = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const request = satelliteConjunctionScreenRequestSchema.safeParse(req.body);

  if (!request.success) {
    return res.status(400).json({
      error: "Invalid conjunction screening request",
      issues: request.error.issues,
    });
  }

  try {
    const result = await screenSatelliteConjunctionCandidates(request.data, req.authUserId ?? null);
    return res.status(200).json({ data: result });
  } catch (error) {
    if (error instanceof SatelliteTleNotFoundError) {
      return res.status(404).json({
        error: error.message,
        missing_norad_ids: error.noradCatIds,
      });
    }

    return next(error);
  }
};
