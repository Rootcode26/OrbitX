import cron, { ScheduledTask } from "node-cron";
import logger from "../config/logger";
import { sgp4PropagationDataServices } from "../modules/satelites/services/satelites-sgp4-data.services";
import { toLocalISOString } from "../helpers/localISOString";

// export const fetchCelesTrackData = () => {
//   const task = cron.schedule("0 */2 * * *", async () => {
//     // fetch Celes track data
//     // IF 403 Show data from DB
//     // IF NOT 403 Fetch data from SGP4 and SATCAT
//     // Then update the DB
//     // Then show it in the frontend
//   })
// }

export const fetchSgp4PropagationData = () => {
  const task = cron.schedule("*/2 * * * *", async () => {

    const currentTime = toLocalISOString();

    logger.info({currentTime}, "Current Time");

    const tleData = {
      "tle_line1": "1 25544U 98067A   26238.50000000  .00012345  00000-0  22000-3 0  9999",
      "tle_line2": "2 25544  51.6400 120.0000 0005000 100.0000 260.0000 15.50000000123456",
      "prediction_time": currentTime
    }

    try {
      const predictionSgp4Data = await fetch("http://192.168.0.120:8000/propagation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(tleData)
        });

      const predictionData = await predictionSgp4Data.json();

      logger.info({ predictionData });
    }
    catch (err) {
      logger.error({ err });
    };

    handleShutdown(task);
  })
}

      const sgp4Data: Sgp4PropagationResponse = await getSgp4PropagationDataServices(tleData, currentTime);
      const currentSateliteData = await getSateliteCurrentData(tleData, currentTime);

    } catch (err) {
      logger.error({ err }, "Failed to fetch SGP4 propagation data");
    }
  }, {
    name: "sgp4-propagation",
    noOverlap: true,
  });
};

export const stopScheduledTasks = async (tasks: ScheduledTask[]): Promise<void> => {
  await Promise.all(tasks.map((task) => task.stop()));
};
