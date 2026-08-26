import { Request, Response, NextFunction } from "express";
import logger from "../../../config/logger";
import { sgp4PropagationDataServices } from "../services/satelites-sgp4-data.services";

export const getSgp4Data = async (req: Request, res: Response, next: NextFunction) => {

  const tleData = {
    "tle_line1": "1 25544U 98067A   26238.50000000  .00012345  00000-0  22000-3 0  9999",
    "tle_line2": "2 25544  51.6400 120.0000 0005000 100.0000 260.0000 15.50000000123456",
    "observation_time": "2026-08-26T04:10:00+05:30"
  }

  try {
    const propagationData = await sgp4PropagationDataServices(tleData);

    return res.status(200).json({ data: propagationData });
  }
  catch (err) {
    return next(err);
  }
}
