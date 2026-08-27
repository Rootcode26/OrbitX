import cron, { ScheduledTask } from "node-cron";
import { env } from "../config/env.ts";
import logger from "../config/logger.ts";
import { toLocalISOString } from "../helpers/localISOString.ts";
import { syncCelestrakData } from "../modules/satelites/services/celestrak.services.ts";
import { getSateliteCurrentData, getSgp4PropagationDataServices } from "../modules/satelites/services/satelites-sgp4-data.services.ts";
import { SatelliteCurrentDataRequest, SatelliteCurrentDataResponse, Sgp4PropagationRequest, Sgp4PropagationResponse } from "../modules/satelites/types.ts";

export const fetchCelesTrakData = (): ScheduledTask => {
  const runSync = async () => {
    try {
      const summary = await syncCelestrakData();
      const hasFailure = summary.satcat.state === "failed" || summary.tle.state === "failed";

      if (hasFailure) {
        logger.error({ summary }, "CelesTrak sync completed with source failures");
        return;
      }

      logger.info({ summary }, "CelesTrak sync completed");
    } catch (err) {
      logger.error({ err }, "CelesTrak sync failed");
    }
  };

  const task = cron.schedule(env.CELESTRAK_SYNC_CRON, runSync, {
    name: "celestrak-sync",
    noOverlap: true,
    timezone: "UTC",
  });

  void task.execute();
  return task;
};

export const fetchSgp4PropagationData = (): ScheduledTask => {
  return cron.schedule("*/2 * * * *", async () => {
    const currentTime = toLocalISOString();
    logger.info({ currentTime }, "Current Time");

    const propagationMockData: Sgp4PropagationRequest = {
        satellites: [
          {
            norad_cat_id: 25544,
            tle_line1:
              "1 25544U 98067A   26235.72586232  .00009235  00000+0  17193-3 0  9995",
            tle_line2:
              "2 25544  51.6333 325.8142 0007700  76.3746 283.8100 15.49592931582224",
          },
          {
            norad_cat_id: 25338,
            tle_line1:
              "1 25338U 98030A   26235.98161312  .00000090  00000+0  54101-4 0  9993",
            tle_line2:
              "2 25338  98.5066 254.7809 0010954 143.4018 216.7913 14.27163643470964",
          },
        ],
        prediction_time:currentTime,
      };

    const satelliteCurrentStateMockData: SatelliteCurrentDataRequest = {
      satellites: [
        {
          norad_cat_id: 25544,
          tle_line1:
            "1 25544U 98067A   26235.72586232  .00009235  00000+0  17193-3 0  9995",
          tle_line2:
            "2 25544  51.6333 325.8142 0007700  76.3746 283.8100 15.49592931582224",
        },
        {
          norad_cat_id: 25338,
          tle_line1:
            "1 25338U 98030A   26235.98161312  .00000090  00000+0  54101-4 0  9993",
          tle_line2:
            "2 25338  98.5066 254.7809 0010954 143.4018 216.7913 14.27163643470964",
        },
      ],
      observation_time: currentTime,
    };

    // const NOR

    try {

      const sgp4Data: Sgp4PropagationResponse = await getSgp4PropagationDataServices(propagationMockData);
      const currentSateliteData: SatelliteCurrentDataResponse = await getSateliteCurrentData(satelliteCurrentStateMockData);

      // const insert_satelite_orbit_data_query = `INSERT INTO satelite_orbit_data (satellite_id, epoch, tle_line1, tle_line2, inclination_degrees, orbital_period_minutes, apogee_km, perigee_km, height_km, speed_km_s, latitude_degrees, longitude_degrees, calculated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`
      // const insert_satelite_orbit_data_values = [currentSateliteData.orbital_period_minutes, currentSateliteData.apogee_height_km, currentSateliteData.perigee_height_km, currentSateliteData.current_height_km, currentSateliteData.current_speed_km_s, currentSateliteData.latitude_degrees, currentSateliteData.longitude_degrees, currentSateliteData.observation_time_utc]

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
