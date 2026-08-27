import logger from "../../../config/logger";
import { TleComparisonData } from "../types";

export const getConjunctionServices = async (tleComparisonData: TleComparisonData) => {
  try {
   const getConjuctionInfo = await fetch("http://192.168.0.101:8000/api/conjunctions/check",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(tleComparisonData)
    }
  );

    const conjuctionData = await getConjuctionInfo.json();

    return conjuctionData
  }
  catch (err) {
    logger.error({ err });
    throw err;
  }
}
