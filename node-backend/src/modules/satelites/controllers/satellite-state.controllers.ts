import { NextFunction, Request, Response } from "express";
import {
  getNearbySatelliteStates,
  getLatestSatelliteState,
  getLatestSatelliteStates,
} from "../services/satellite-state.services.ts";
import { SatelliteStateNotFoundError } from "../services/satellite-read.errors.ts";
import {
  nearbySatelliteQuerySchema,
  satelliteNoradParamsSchema,
  satelliteStateListQuerySchema,
} from "../validation/satellite-read.validation.ts";

export const listNearbySatelliteStates = async (req: Request, res: Response, next: NextFunction) => {
  const params = satelliteNoradParamsSchema.safeParse(req.params);
  const query = nearbySatelliteQuerySchema.safeParse(req.query);

  if (!params.success || !query.success) {
    return res.status(400).json({
      error: "Invalid nearby satellite query",
      issues: !params.success ? params.error.issues : !query.success ? query.error.issues : [],
    });
  }

  try {
    const result = await getNearbySatelliteStates(
      params.data.noradCatId,
      query.data.page,
      query.data.page_size,
    );
    return res.status(200).json({ data: result });
  } catch (error) {
    if (error instanceof SatelliteStateNotFoundError) {
      return res.status(404).json({
        error: error.message,
        norad_cat_id: error.noradCatId,
      });
    }
    return next(error);
  }
};

export const listCurrentSatelliteStates = async (req: Request, res: Response, next: NextFunction) => {
  const query = satelliteStateListQuerySchema.safeParse(req.query);

  if (!query.success) {
    return res.status(400).json({
      error: "Invalid satellite state query",
      issues: query.error.issues,
    });
  }

  try {
    const states = await getLatestSatelliteStates(query.data.limit);
    return res.status(200).json({ data: states });
  } catch (error) {
    return next(error);
  }
};

export const getCurrentSatelliteState = async (req: Request, res: Response, next: NextFunction) => {
  const params = satelliteNoradParamsSchema.safeParse(req.params);

  if (!params.success) {
    return res.status(400).json({
      error: "Invalid NORAD ID",
      issues: params.error.issues,
    });
  }

  try {
    const state = await getLatestSatelliteState(params.data.noradCatId);
    return res.status(200).json({ data: state });
  } catch (error) {
    if (error instanceof SatelliteStateNotFoundError) {
      return res.status(404).json({
        error: error.message,
        norad_cat_id: error.noradCatId,
      });
    }

    return next(error);
  }
};
