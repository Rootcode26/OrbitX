import logger from "../../../config/logger";
import { MultipleTleComparisonData, TleComparisonData } from "../types";

export const getMultipleConjunctionServices = async (tleMultipleComparisonData: MultipleTleComparisonData) => {
  try {
   const getMultipleConjuctionInfo = await fetch("http://192.168.0.119:8000/api/conjunctions/screen",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(tleMultipleComparisonData)
    }
  );

    const multipleConjuctionData = await getMultipleConjuctionInfo.json();

    return multipleConjuctionData;
  }
  catch (err) {
    logger.error({ err });
    throw err;
  }
}
