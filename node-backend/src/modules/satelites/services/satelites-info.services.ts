import logger from "../../../config/logger";

export const getSatelitesData = async () => {
  const SATELITE_DATA_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=ACTIVE&FORMAT=TLE";

  try {
      const response = await fetch(
        SATELITE_DATA_URL,
        {
          headers: {
            "User-Agent": "OrbitX/1.0",
            Accept: "text/plain",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `CelesTrak error: ${response.status} ${response.statusText}`
        );
      }

    const sateliteData = await response.text();

    return sateliteData;
    }
  catch (err) {
    throw err;
  }
}
