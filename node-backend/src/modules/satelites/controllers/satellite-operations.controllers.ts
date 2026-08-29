import { NextFunction, Request, Response } from "express";
import { calculateGroundStationPasses } from "../services/ground-station.services.ts";
import {
  getSatelliteTrajectory,
  SatelliteTrajectoryServiceError,
} from "../services/satellite-trajectory.services.ts";
import { SatelliteTleNotFoundError } from "../services/satelites-conjuction.services.ts";
import {
  groundStationPassRequestSchema,
  satelliteTrajectoryRequestSchema,
} from "../validation/satellite-operations.validation.ts";

const handleOperationError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof SatelliteTleNotFoundError) {
    return res.status(404).json({
      error: error.message,
      missing_norad_ids: error.noradCatIds,
    });
  }

  if (error instanceof SatelliteTrajectoryServiceError) {
    return res.status(502).json({ error: error.message });
  }

  return next(error);
};

export const getSatelliteTrajectoryData = async (req: Request, res: Response, next: NextFunction) => {
  const request = satelliteTrajectoryRequestSchema.safeParse(req.body);

  if (!request.success) {
    return res.status(400).json({
      error: "Invalid trajectory request",
      issues: request.error.issues,
    });
  }

  try {
    const trajectory = await getSatelliteTrajectory(request.data);
    return res.status(200).json({ data: trajectory });
  } catch (error) {
    return handleOperationError(error, res, next);
  }
};

export const getGroundStationPassData = async (req: Request, res: Response, next: NextFunction) => {
  const request = groundStationPassRequestSchema.safeParse(req.body);

  if (!request.success) {
    return res.status(400).json({
      error: "Invalid ground-station pass request",
      issues: request.error.issues,
    });
  }

  try {
    const passes = await calculateGroundStationPasses(request.data);
    return res.status(200).json({ data: passes });
  } catch (error) {
    return handleOperationError(error, res, next);
  }
};
