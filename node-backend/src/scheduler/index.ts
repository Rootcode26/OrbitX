import cron, { ScheduledTask } from "node-cron";
import { env } from "../config/env.ts";
import logger from "../config/logger.ts";
import { toLocalISOString } from "../helpers/localISOString.ts";
import { syncCelestrakData } from "../modules/satelites/services/celestrak.services.ts";
import { getSateliteCurrentData, getSgp4PropagationDataServices } from "../modules/satelites/services/satelites-sgp4-data.services.ts";
import { SatelliteCurrentDataRequest, SatelliteCurrentDataResponse, Sgp4PropagationRequest, Sgp4PropagationResponse } from "../modules/satelites/types.ts";
import {
  getAllLatestOrbitalObjectTleRecords,
  getLatestSateliteTleRecords,
} from "../modules/satelites/repositories/satelite-orbit.repository.ts";
import { storeSatellitePropagationResults } from "../modules/satelites/repositories/satelite-propagation.repository.ts";
import {
  SATELITE_PROPAGATION_BATCH_SIZE,
  SATELITE_PROPAGATION_DEBRIS_LIMIT,
  SATELITE_PROPAGATION_LIMIT,
} from "../constants/index.ts";
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

type PropagationTleRecords = Sgp4PropagationRequest["satellites"];

let activePropagationJob: string | null = null;

const processPropagationRecords = async (
  tleRecords: PropagationTleRecords,
  currentTime: string,
  jobName: string,
) => {
  const storageSummary = {
    requested: 0,
    stored: 0,
    skippedNoradIds: [] as number[],
  };
  const batches = Math.ceil(tleRecords.length / SATELITE_PROPAGATION_BATCH_SIZE);

  for (let offset = 0; offset < tleRecords.length; offset += SATELITE_PROPAGATION_BATCH_SIZE) {
    const batch = tleRecords.slice(offset, offset + SATELITE_PROPAGATION_BATCH_SIZE);
    const batchNumber = Math.floor(offset / SATELITE_PROPAGATION_BATCH_SIZE) + 1;
    const propagationData: Sgp4PropagationRequest = {
      satellites: batch,
      prediction_time: currentTime,
    };
    const satelliteCurrentStateData: SatelliteCurrentDataRequest = {
      observation_time: currentTime,
      satellites: batch.map((data) => ({
        ...data,
        norad_cat_id: Number(data.norad_cat_id),
      })),
    };

    logger.info(
      { jobName, batchNumber, batches, objects: batch.length },
      "Starting SGP4 propagation batch",
    );

    const [sgp4Data, currentSateliteData]: [Sgp4PropagationResponse, SatelliteCurrentDataResponse] = await Promise.all([
      getSgp4PropagationDataServices(propagationData),
      getSateliteCurrentData(satelliteCurrentStateData),
    ]);
    const batchStorage = await storeSatellitePropagationResults(
      batch,
      sgp4Data,
      currentSateliteData,
    );

    storageSummary.requested += batchStorage.requested;
    storageSummary.stored += batchStorage.stored;
    storageSummary.skippedNoradIds.push(...batchStorage.skippedNoradIds);

    logger.info(
      { jobName, batchNumber, batches, storageSummary: batchStorage },
      "SGP4 propagation batch stored",
    );
  }

  return storageSummary;
};

const runPropagationJob = async (
  jobName: string,
  loadTleRecords: () => Promise<PropagationTleRecords>,
): Promise<void> => {
  if (activePropagationJob) {
    logger.warn(
      { jobName, activePropagationJob },
      "Skipping SGP4 propagation job because another propagation job is active",
    );
    return;
  }

  activePropagationJob = jobName;
  const currentTime = toLocalISOString();

  try {
    const tleRecords = await loadTleRecords();
    if (tleRecords.length === 0) {
      logger.warn({ jobName }, "Skipping SGP4 propagation job because no TLE records are available");
      return;
    }

    logger.info(
      { jobName, currentTime, objects: tleRecords.length },
      "Starting SGP4 propagation job",
    );
    const storageSummary = await processPropagationRecords(tleRecords, currentTime, jobName);

    logger.info({
      jobName,
      requested: storageSummary.requested,
      stored: storageSummary.stored,
      skipped: storageSummary.skippedNoradIds.length,
    }, "SGP4 propagation job completed");

    if (storageSummary.skippedNoradIds.length > 0) {
      await recordSchedulerAlert({
        severity: "MEDIUM",
        source: "PROPAGATION",
        title: `${jobName} propagation completed with partial failures`,
        description: `${storageSummary.skippedNoradIds.length} of ${storageSummary.requested} requested orbital objects were not stored.`,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown propagation error";
    await recordSchedulerAlert({
      severity: "HIGH",
      source: "PROPAGATION",
      title: `${jobName} propagation failed`,
      description: message,
    });
    logger.error({ err, jobName }, "Failed to run SGP4 propagation job");
  } finally {
    activePropagationJob = null;
  }
};

export const fetchSgp4PropagationData = (): ScheduledTask => cron.schedule(
  env.SGP4_PROPAGATION_CRON,
  () => runPropagationJob(
    "Priority",
    () => getLatestSateliteTleRecords(
      SATELITE_PROPAGATION_LIMIT,
      SATELITE_PROPAGATION_DEBRIS_LIMIT,
    ),
  ),
  {
    name: "sgp4-propagation",
    noOverlap: true,
    timezone: "UTC",
  },
);

export const fetchAllSgp4PropagationData = (): ScheduledTask => cron.schedule(
  env.SGP4_FULL_PROPAGATION_CRON,
  () => runPropagationJob("Full orbital catalog", getAllLatestOrbitalObjectTleRecords),
  {
    name: "sgp4-full-propagation",
    noOverlap: true,
    timezone: "UTC",
  },
);

export const stopScheduledTasks = async (tasks: ScheduledTask[]): Promise<void> => {
  await Promise.all(tasks.map((task) => task.stop()));
};
