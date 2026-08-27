import logger from "../../../config/logger";
import {
  SatelliteCurrentDataRequest,
  SatelliteCurrentDataResponse,
  Sgp4PropagationRequest,
  Sgp4PropagationResponse,
  TleData,
} from "../types";

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



export const getSgp4PropagationDataServices = async (
  tleData: Sgp4PropagationRequest
): Promise<Sgp4PropagationResponse> => {

const sgp4PropagationResponse = await fetch("http://192.168.0.109:8000/propagation", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ ...tleData }),
});

const responseBody = await sgp4PropagationResponse.text();
if (!sgp4PropagationResponse.ok) {
  throw new Error(
    `Propagation service error: ${sgp4PropagationResponse.status} ${sgp4PropagationResponse.statusText}: ${responseBody.slice(0, 500)}`,
  );
}

  logger.info({ predictionData: JSON.parse(responseBody) });
  return JSON.parse(responseBody);
}

export const getSateliteCurrentData = async (
  tleData: SatelliteCurrentDataRequest,
): Promise<SatelliteCurrentDataResponse> => {
  const sateliteCurrentResponse = await fetch("http://192.168.0.109:8000/api/satellite-state/current", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...tleData }),
  });

  const sateliteCurrentData = await sateliteCurrentResponse.text();

  if (!sateliteCurrentResponse.ok) {
    throw new Error(
      `Current satellite data  service error: ${sateliteCurrentResponse.status} ${sateliteCurrentResponse.statusText}: ${sateliteCurrentData.slice(0, 500)}`,
    );
  }

  logger.info({ sateliteData: JSON.parse(sateliteCurrentData) });
  return JSON.parse(sateliteCurrentData);
}
