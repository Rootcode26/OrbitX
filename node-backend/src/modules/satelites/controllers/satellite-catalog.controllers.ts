import { NextFunction, Request, Response } from "express";
import {
  getSatelliteCatalogPage,
  getSatelliteCatalogRecord,
  getSatelliteCatalogOptions,
} from "../services/satellite-catalog.services.ts";
import { SatelliteNotFoundError } from "../services/satellite-read.errors.ts";
import { satelliteCatalogQuerySchema } from "../validation/satellite-catalog.validation.ts";
import { satelliteNoradParamsSchema } from "../validation/satellite-read.validation.ts";

export const listSatelliteCatalog = async (req: Request, res: Response, next: NextFunction) => {
  const query = satelliteCatalogQuerySchema.safeParse(req.query);

  if (!query.success) {
    return res.status(400).json({
      error: "Invalid satellite catalog query",
      issues: query.error.issues,
    });
  }

  try {
    const catalog = await getSatelliteCatalogPage(query.data);
    return res.status(200).json({ data: catalog });
  } catch (error) {
    return next(error);
  }
};

export const getSatelliteCatalogFilterOptions = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const options = await getSatelliteCatalogOptions();
    return res.status(200).json({ data: options });
  } catch (error) {
    return next(error);
  }
};

export const getSatelliteCatalogItem = async (req: Request, res: Response, next: NextFunction) => {
  const params = satelliteNoradParamsSchema.safeParse(req.params);

  if (!params.success) {
    return res.status(400).json({
      error: "Invalid NORAD ID",
      issues: params.error.issues,
    });
  }

  try {
    const satellite = await getSatelliteCatalogRecord(params.data.noradCatId);
    return res.status(200).json({ data: satellite });
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
