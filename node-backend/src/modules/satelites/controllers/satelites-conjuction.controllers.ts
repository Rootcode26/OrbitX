import { Request, Response, NextFunction } from "express";
import { getConjunctionServices } from "../services/satelites-conjuction.services";

export const getConjuctionData = async (req: Request, res: Response, next: NextFunction) => {

  const tleComparisonData ={
    "satellite_a": {
      "norad_cat_id": "25544",
      "name": "ISS (ZARYA)",
      "tle_line1": "1 25544U 98067A   26235.72586232  .00009235  00000+0  17193-3 0  9995",
      "tle_line2": "2 25544  51.6333 325.8142 0007700  76.3746 283.8100 15.49592931582224"
    },
    "satellite_b": {
      "norad_cat_id": "25338",
      "name": "NOAA 15",
      "tle_line1": "1 25338U 98030A   26235.98161312  .00000090  00000+0  54101-4 0  9993",
      "tle_line2": "2 25338  98.5066 254.7809 0010954 143.4018 216.7913 14.27163643470964"
    },
    "start_time": "2026-08-26T14:00:00Z",
    "duration_minutes": 120,
    "step_seconds": 60,
    "include_seperation_profile": true,
  }

  try {

    const getConjuctionInfo = await getConjunctionServices(tleComparisonData);

    return res.status(200).json({ data: getConjuctionInfo });
  }
  catch (err) {
    return next(err);
  }
}
