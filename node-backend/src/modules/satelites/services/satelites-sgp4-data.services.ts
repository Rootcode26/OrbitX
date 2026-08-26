import logger from "../../../config/logger";
import { TleData } from "../types";

export const sgp4PropagationDataServices = async (tleData: TleData) => {
  try {
  const sgp4Data = await fetch("http://192.168.0.120:8000/api/satellite-state/current",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(tleData)
    }
  );

    const sgp4PropagationData = await sgp4Data.json();

    return sgp4PropagationData;
  }
  catch (err) {
    throw err;
  }
}
