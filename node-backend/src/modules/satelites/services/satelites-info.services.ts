import { getStoredTleRecords } from "../repositories/celestrak.repository.ts";

export const getSatelitesData = async (): Promise<string> => {
  const records = await getStoredTleRecords();

  if (records.length === 0) {
    throw new Error("No cached TLE data is available yet");
  }

  return `${records
    .map((record) => `${record.satelliteName}\n${record.tleLine1}\n${record.tleLine2}`)
    .join("\n")}\n`;
};
