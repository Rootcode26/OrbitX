import cron, { ScheduledTask } from "node-cron";
import { env } from "../config/env.ts";
import logger from "../config/logger.ts";
import { toLocalISOString } from "../helpers/localISOString.ts";
import { syncCelestrakData } from "../modules/satelites/services/celestrak.services.ts";
import { getSateliteCurrentData, getSgp4PropagationDataServices } from "../modules/satelites/services/satelites-sgp4-data.services.ts";
import { SatelliteCurrentDataRequest, SatelliteCurrentDataResponse, Sgp4PropagationRequest, Sgp4PropagationResponse } from "../modules/satelites/types.ts";
import { getLatestSateliteTleRecords } from "../modules/satelites/repositories/satelite-orbit.repository.ts";
import { storeSatellitePropagationResults } from "../modules/satelites/repositories/satelite-propagation.repository.ts";
import { SATELITE_PROPAGATION_DEBRIS_LIMIT, SATELITE_PROPAGATION_LIMIT } from "../constants/index.ts";
import { recordCelestrakSyncStatus } from "../modules/satelites/services/celestrak-sync-status.services.ts";
import { createAlertIfNotOpen } from "../modules/satelites/services/alert.services.ts";
import { AlertCreateRequest } from "../modules/satelites/types.ts";

const recordSchedulerAlert = async (alert: AlertCreateRequest): Promise<void> => {
  try {
    await createAlertIfNotOpen(alert);
  } catch (error) {
    logger.error({ error, alert }, "Failed to persist scheduler alert");
  }
};

export const fetchCelesTrakData = (): ScheduledTask => {
  const runSync = async () => {
    try {
      const summary = await syncCelestrakData();
      recordCelestrakSyncStatus(summary);
      const hasFailure = summary.satcat.state === "failed" || summary.tle.state === "failed";

      if (hasFailure) {
        const failedSources = [
          summary.satcat.state === "failed" ? "SATCAT" : null,
          summary.tle.state === "failed" ? "TLE" : null,
        ].filter(Boolean).join(" and ");
        await recordSchedulerAlert({
          severity: "HIGH",
          source: "CATALOG_SYNC",
          title: "CelesTrak synchronization failure",
          description: `${failedSources} synchronization failed; cached records remain available.`,
        });
        logger.error({ summary }, "CelesTrak sync completed with source failures");
        return;
      }

      logger.info({ summary }, "CelesTrak sync completed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error";
      recordCelestrakSyncStatus({
        satcat: { state: "failed", records: 0, error: message },
        tle: { state: "failed", records: 0, error: message },
      });
      await recordSchedulerAlert({
        severity: "HIGH",
        source: "CATALOG_SYNC",
        title: "CelesTrak synchronization failure",
        description: message,
      });
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
  return cron.schedule(env.SGP4_PROPAGATION_CRON, async () => {
    const currentTime = toLocalISOString();
    logger.info({ currentTime }, "Current Time");

    // const propagationMockData: Sgp4PropagationRequest = {
    //     satellites: [
    //       {
    //         norad_cat_id: 25544,
    //         tle_line1:
    //           "1 25544U 98067A   26235.72586232  .00009235  00000+0  17193-3 0  9995",
    //         tle_line2:
    //           "2 25544  51.6333 325.8142 0007700  76.3746 283.8100 15.49592931582224",
    //       },
    //       {
    //         norad_cat_id: 25338,
    //         tle_line1:
    //           "1 25338U 98030A   26235.98161312  .00000090  00000+0  54101-4 0  9993",
    //         tle_line2:
    //           "2 25338  98.5066 254.7809 0010954 143.4018 216.7913 14.27163643470964",
    //       },
    //     ],
    //     prediction_time:currentTime,
    //   };

    // const satelliteCurrentStateMockData: SatelliteCurrentDataRequest = {
    //   satellites: [
    //     {
    //       norad_cat_id: 25544,
    //       tle_line1:
    //         "1 25544U 98067A   26235.72586232  .00009235  00000+0  17193-3 0  9995",
    //       tle_line2:
    //         "2 25544  51.6333 325.8142 0007700  76.3746 283.8100 15.49592931582224",
    //     },
    //     {
    //       norad_cat_id: 25338,
    //       tle_line1:
    //         "1 25338U 98030A   26235.98161312  .00000090  00000+0  54101-4 0  9993",
    //       tle_line2:
    //         "2 25338  98.5066 254.7809 0010954 143.4018 216.7913 14.27163643470964",
    //     },
    //   ],
    //   observation_time: currentTime,
    // };

    // const NOR

    try {

      const tleRecords = await getLatestSateliteTleRecords(SATELITE_PROPAGATION_LIMIT, SATELITE_PROPAGATION_DEBRIS_LIMIT);
      if (tleRecords.length === 0) {
        logger.warn("Skipping SGP4 propagation batch because no TLE records are available");
        return;
      }

      const propagationData: Sgp4PropagationRequest = {
        satellites: tleRecords,
        prediction_time: currentTime
      }

      const satelliteCurrentStateData: SatelliteCurrentDataRequest = {
        observation_time: currentTime,
        satellites: tleRecords.map((data) => {
          return { ...data, norad_cat_id: Number(data.norad_cat_id) };
        })
      }

      const sgp4Data: Sgp4PropagationResponse = await getSgp4PropagationDataServices(propagationData);
      const currentSateliteData: SatelliteCurrentDataResponse = await getSateliteCurrentData(satelliteCurrentStateData);

      const storageSummary = await storeSatellitePropagationResults(
        tleRecords,
        sgp4Data,
        currentSateliteData,
      );

      logger.info({ storageSummary }, "SGP4 propagation snapshots stored");

      if (storageSummary.skippedNoradIds.length > 0) {
        await recordSchedulerAlert({
          severity: "MEDIUM",
          source: "PROPAGATION",
          title: "Propagation batch completed with partial failures",
          description: `${storageSummary.skippedNoradIds.length} of ${storageSummary.requested} requested satellites were not stored.`,
        });
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown propagation error";
      await recordSchedulerAlert({
        severity: "HIGH",
        source: "PROPAGATION",
        title: "Propagation batch failed",
        description: message,
      });
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
