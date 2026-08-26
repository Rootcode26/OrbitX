import { Request, Response, NextFunction } from "express";
import { getConjunctionServices } from "../services/satelites-conjuction.services";
import { getMultipleConjunctionServices } from "../services/satalites-multiple.services";

export const getMultipleConjuctionData = async (req: Request, res: Response, next: NextFunction) => {

  const multipleTleComparisonData ={
    "satellites": [
      {
        "norad_id": "25544",
        "name": "ISS (ZARYA)",
        "tle_line1": "1 25544U 98067A   26235.72586232  .00009235  00000+0  17193-3 0  9995",
        "tle_line2": "2 25544  51.6333 325.8142 0007700  76.3746 283.8100 15.49592931582224"
      },
      {
        "norad_id": "25338",
        "name": "NOAA 15",
        "tle_line1": "1 25338U 98030A   26235.98161312  .00000090  00000+0  54101-4 0  9993",
        "tle_line2": "2 25338  98.5066 254.7809 0010954 143.4018 216.7913 14.27163643470964"
      },
      {
        "norad_id": "28654",
        "name": "NOAA 18",
        "tle_line1": "1 28654U 05018A   26235.94444444  .00000100  00000+0  80000-4 0  9999",
        "tle_line2": "2 28654  99.1234 123.4567 0012000 200.1234 159.8765 14.12567890987654"
      },
      {
        "norad_id": "33591",
        "name": "NOAA 19",
        "tle_line1": "1 33591U 09005A   26235.90000000  .00000080  00000+0  70000-4 0  9998",
        "tle_line2": "2 33591  99.2000 234.5678 0011000 150.1234 210.8765 14.14000000123456"
      },
      {
        "norad_id": "27424",
        "name": "AQUA",
        "tle_line1": "1 27424U 02022A   26235.85000000  .00000120  00000+0  90000-4 0  9997",
        "tle_line2": "2 27424  98.2000 345.6789 0009000 120.1234 239.8765 14.50000000123457"
      }
    ],
    "start_time": "2026-08-26T14:00:00Z",
    "duration_minutes": 120,
    "step_seconds": 60
  }

  try {
    const getMultipleConjuctionInfo = await getMultipleConjunctionServices(multipleTleComparisonData);

    return res.status(200).json({ data: getMultipleConjuctionInfo });
  }
  catch (err) {
    return next(err);
  }
}
