import { Request, Response, NextFunction } from "express"
import { getSatelitesData } from "../services/satelites-info.services"

export const getSatelitesTleData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sateliteData = await getSatelitesData();
    return res
        .status(200)
        .type("text/plain")
        .send(sateliteData);
  }
  catch (err) {
    console.error(err);
    return
    // return next(err);
  }
}
