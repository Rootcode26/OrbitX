import { env } from "../../../config/env";
import logger from "../../../config/logger";
import { MultipleTleComparisonData, TleComparisonData } from "../types";

export const getMultipleConjunctionServices = async (tleMultipleComparisonData: MultipleTleComparisonData) => {
  try {
   const getMultipleConjuctionInfo = await fetch(env.CONJUNCTION_SCREEN_URL,
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
