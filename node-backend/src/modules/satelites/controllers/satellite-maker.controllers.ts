import { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../../../auth/types.ts";
import {
  commissionSatellite,
  getCommissionedSatellites,
  SatelliteAlreadyCommissionedError,
  previewSatellite,
  SatelliteMakerServiceError,
} from "../services/satellite-maker.services.ts";
import {
  ConjunctionServiceError,
  SatelliteTleNotFoundError,
} from "../services/satelites-conjuction.services.ts";
import { satelliteMakerRequestSchema } from "../validation/satellite-maker.validation.ts";

export const listCommissionedSatelliteObjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const satellites = await getCommissionedSatellites(req.authUserId!);
    return res.status(200).json({ data: satellites });
  } catch (error) {
    return next(error);
  }
};

export const createSatellitePreview = async (req: Request, res: Response, next: NextFunction) => {
  const request = satelliteMakerRequestSchema.safeParse(req.body);

  if (!request.success) {
    return res.status(400).json({
      error: "Invalid satellite preview request",
      issues: request.error.issues,
    });
  }

  try {
    const preview = await previewSatellite(request.data);
    return res.status(200).json({ data: preview });
  } catch (error) {
    if (error instanceof SatelliteTleNotFoundError) {
      return res.status(404).json({
        error: error.message,
        missing_norad_ids: error.noradCatIds,
      });
    }

    if (
      error instanceof SatelliteMakerServiceError
      || error instanceof ConjunctionServiceError
    ) {
      return res.status(502).json({ error: error.message });
    }

    return next(error);
  }
};

export const commissionSatelliteObject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const request = satelliteMakerRequestSchema.safeParse(req.body);

  if (!request.success) {
    return res.status(400).json({
      error: "Invalid satellite commission request",
      issues: request.error.issues,
    });
  }

  try {
    const satellite = await commissionSatellite(request.data, req.authUserId!);
    return res.status(201).json({ data: satellite });
  } catch (error) {
    if (error instanceof SatelliteAlreadyCommissionedError) {
      return res.status(409).json({
        error: error.message,
        norad_cat_id: error.noradCatId,
      });
    }

    if (error instanceof SatelliteTleNotFoundError) {
      return res.status(404).json({
        error: error.message,
        missing_norad_ids: error.noradCatIds,
      });
    }

    if (error instanceof SatelliteMakerServiceError || error instanceof ConjunctionServiceError) {
      return res.status(502).json({ error: error.message });
    }

    return next(error);
  }
};
