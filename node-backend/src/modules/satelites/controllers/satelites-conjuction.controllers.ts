import { Request, Response, NextFunction } from "express";
import {
  checkSatelliteConjunction,
  ConjunctionServiceError,
  SatelliteTleNotFoundError,
} from "../services/satelites-conjuction.services.ts";
import { conjunctionCheckRequestSchema } from "../validation/conjunction.validation.ts";

export const getConjunctionData = async (req: Request, res: Response, next: NextFunction) => {
  const parsedRequest = conjunctionCheckRequestSchema.safeParse(req.body);

  if (!parsedRequest.success) {
    return res.status(400).json({
      error: "Invalid conjunction request",
      issues: parsedRequest.error.issues,
    });
  }

  try {
    const conjunctionInfo = await checkSatelliteConjunction(parsedRequest.data);

    return res.status(200).json({ data: conjunctionInfo });
  } catch (error) {
    if (error instanceof SatelliteTleNotFoundError) {
      return res.status(404).json({
        error: error.message,
        missing_norad_ids: error.noradCatIds,
      });
    }

    if (error instanceof ConjunctionServiceError) {
      return res.status(502).json({ error: error.message });
    }

    return next(error);
  }
};
