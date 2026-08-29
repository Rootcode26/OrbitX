import { NextFunction, Request, Response } from "express";
import {
  getDataSourceStatuses,
  getOverviewSummary,
  getSatelliteAnalytics,
} from "../services/satellite-dashboard.services.ts";

export const getOverviewData = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const overview = await getOverviewSummary();
    return res.status(200).json({ data: overview });
  } catch (error) {
    return next(error);
  }
};

export const getAnalyticsData = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const analytics = await getSatelliteAnalytics();
    return res.status(200).json({ data: analytics });
  } catch (error) {
    return next(error);
  }
};

export const getDataSources = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sources = await getDataSourceStatuses();
    return res.status(200).json({ data: { sources } });
  } catch (error) {
    return next(error);
  }
};
