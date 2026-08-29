import { env } from "../../../config/env.ts";
import logger from "../../../config/logger.ts";
import {
  CelestrakFetchResult,
  CelestrakSourceSummary,
  CelestrakSyncSummary,
  SatcatRecord,
  TleRecord,
} from "../celestrak.types.ts";
import {
  getCelestrakCacheSummary,
  upsertSatcatRecords,
  upsertTleRecords,
} from "../repositories/celestrak.repository.ts";

const CELESTRAK_HEADERS = {
  "User-Agent": env.CELESTRAK_USER_AGENT,
};

const OBJECT_TYPES = new Set(["PAY", "R/B", "DEB", "UNK"]);
const OPERATIONAL_STATUSES = new Set(["+", "-", "P", "B", "S", "X", "D", "?"]);
const DATA_STATUS_CODES = new Set(["NCE", "NIE", "NEA"]);
const ORBIT_TYPES = new Set(["ORB", "LAN", "IMP", "DOC", "R/T"]);

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const toNullableDate = (value: unknown): string | null => {
  const date = toNullableString(value);
  const match = date?.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
};

const parseNoradId = (value: unknown): number => {
  const noradCatId = Number(value);
  if (!Number.isSafeInteger(noradCatId) || noradCatId <= 0) {
    throw new Error(`Invalid NORAD catalog ID: ${String(value)}`);
  }
  return noradCatId;
};

export const parseSatcatData = (payload: unknown): SatcatRecord[] => {
  if (!Array.isArray(payload)) {
    throw new Error("CelesTrak SATCAT response must be an array");
  }

  return payload.map((value, index) => {
    if (!value || typeof value !== "object") {
      throw new Error(`Invalid SATCAT record at index ${index}`);
    }

    const record = value as Record<string, unknown>;
    const satelliteName = toNullableString(record.OBJECT_NAME);
    if (!satelliteName) {
      throw new Error(`SATCAT record at index ${index} has no OBJECT_NAME`);
    }

    const objectType = toNullableString(record.OBJECT_TYPE);
    const operationalStatus = toNullableString(record.OPS_STATUS_CODE);
    const dataStatusCode = toNullableString(record.DATA_STATUS_CODE);
    const orbitType = toNullableString(record.ORBIT_TYPE);

    return {
      noradCatId: parseNoradId(record.NORAD_CAT_ID),
      satelliteName,
      objectType: objectType && OBJECT_TYPES.has(objectType)
        ? objectType as SatcatRecord["objectType"]
        : null,
      owner: toNullableString(record.OWNER),
      operationalStatus: operationalStatus && OPERATIONAL_STATUSES.has(operationalStatus)
        ? operationalStatus as SatcatRecord["operationalStatus"]
        : null,
      launchDate: toNullableDate(record.LAUNCH_DATE),
      launchSite: toNullableString(record.LAUNCH_SITE),
      decayDate: toNullableDate(record.DECAY_DATE),
      internationalDesignator: toNullableString(record.OBJECT_ID),
      radarCrossSection: toNullableNumber(record.RCS),
      dataStatusCode: dataStatusCode && DATA_STATUS_CODES.has(dataStatusCode)
        ? dataStatusCode as SatcatRecord["dataStatusCode"]
        : null,
      orbitCenter: toNullableString(record.ORBIT_CENTER),
      orbitType: orbitType && ORBIT_TYPES.has(orbitType)
        ? orbitType as SatcatRecord["orbitType"]
        : null,
      orbitalPeriodMinutes: toNullableNumber(record.PERIOD),
      inclinationDegrees: toNullableNumber(record.INCLINATION),
      apogeeKm: toNullableNumber(record.APOGEE),
      perigeeKm: toNullableNumber(record.PERIGEE),
    };
  });
};

const parseAlpha5NoradId = (value: string): number => {
  if (/^\d{5}$/.test(value)) return Number(value);

  const alpha5Characters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const prefix = alpha5Characters.indexOf(value[0] ?? "");
  if (prefix < 0 || !/^\d{4}$/.test(value.slice(1))) {
    throw new Error(`Invalid TLE NORAD catalog ID: ${value}`);
  }

  return (prefix + 10) * 10_000 + Number(value.slice(1));
};

const parseTleEpoch = (line1: string): string => {
  const epochValue = line1.slice(18, 32).trim();
  if (!/^\d{5}\.\d+$/.test(epochValue)) {
    throw new Error(`Invalid TLE epoch: ${epochValue}`);
  }

  const twoDigitYear = Number(epochValue.slice(0, 2));
  const dayOfYear = Number(epochValue.slice(2));
  const year = twoDigitYear >= 57 ? 1900 + twoDigitYear : 2000 + twoDigitYear;

  if (dayOfYear < 1 || dayOfYear >= 367) {
    throw new Error(`Invalid TLE day of year: ${dayOfYear}`);
  }

  const epochMilliseconds = Date.UTC(year, 0, 1) + (dayOfYear - 1) * 86_400_000;
  return new Date(epochMilliseconds).toISOString();
};

export const parseTleData = (payload: string): TleRecord[] => {
  const lines = payload
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length % 3 !== 0) {
    throw new Error(`Expected three lines per TLE record, received ${lines.length} lines`);
  }

  const records: TleRecord[] = [];

  for (let index = 0; index < lines.length; index += 3) {
    const nameLine = lines[index] ?? "";
    const tleLine1 = lines[index + 1] ?? "";
    const tleLine2 = lines[index + 2] ?? "";

    if (!tleLine1.startsWith("1 ") || !tleLine2.startsWith("2 ")) {
      throw new Error(`Invalid TLE record beginning at line ${index + 1}`);
    }

    const line1NoradId = parseAlpha5NoradId(tleLine1.slice(2, 7));
    const line2NoradId = parseAlpha5NoradId(tleLine2.slice(2, 7));
    if (line1NoradId !== line2NoradId) {
      throw new Error(`Mismatched NORAD IDs in TLE record ${line1NoradId}`);
    }

    const meanMotion = toNullableNumber(tleLine2.slice(52, 63).trim());
    const inclinationDegrees = toNullableNumber(tleLine2.slice(8, 16).trim());

    records.push({
      noradCatId: line1NoradId,
      satelliteName: nameLine.startsWith("0 ") ? nameLine.slice(2).trim() : nameLine.trim(),
      epoch: parseTleEpoch(tleLine1),
      tleLine1,
      tleLine2,
      inclinationDegrees,
      orbitalPeriodMinutes: meanMotion && meanMotion > 0 ? 1_440 / meanMotion : null,
      apogeeKm: null,
      perigeeKm: null,
    });
  }

  return records;
};

const fetchCelestrak = async <T>(url: string, accept: string, parse: (payload: string) => T[]): Promise<CelestrakFetchResult<T>> => {
  const response = await fetch(url, {
    headers: {
      ...CELESTRAK_HEADERS,
      Accept: accept,
    },
    signal: AbortSignal.timeout(env.CELESTRAK_REQUEST_TIMEOUT_MS),
  });

  if (response.status === 403) {
    const responseBody = await response.text();
    logger.warn(
      { url, status: response.status, responseBody: responseBody.slice(0, 500) },
      "CelesTrak returned 403; keeping cached data",
    );
    return { state: "cached", records: [], httpStatus: response.status };
  }

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `CelesTrak request failed: ${response.status} ${response.statusText}: ${responseBody.slice(0, 500)}`,
    );
  }

  return {
    state: "fresh",
    records: parse(await response.text()),
    httpStatus: response.status,
  };
};

const buildGroupUrl = (baseUrl: string, group: string): string => {
  const url = new URL(baseUrl);
  url.searchParams.set("GROUP", group);
  return url.toString();
};

const deduplicateSatcatRecords = (records: SatcatRecord[]): SatcatRecord[] => Array.from(
  new Map(records.map((record) => [record.noradCatId, record])).values(),
);

const deduplicateTleRecords = (records: TleRecord[]): TleRecord[] => Array.from(
  records.reduce((latest, record) => {
    const existing = latest.get(record.noradCatId);
    if (!existing || Date.parse(record.epoch) > Date.parse(existing.epoch)) {
      latest.set(record.noradCatId, record);
    }
    return latest;
  }, new Map<number, TleRecord>()).values(),
);

const fetchCelestrakGroups = async <T>(baseUrl: string, accept: string, parse: (payload: string) => T[], deduplicate: (records: T[]) => T[]): Promise<CelestrakFetchResult<T>> => {
  const results = await Promise.allSettled(
    env.CELESTRAK_GROUPS.map((group) => fetchCelestrak(buildGroupUrl(baseUrl, group), accept, parse)),
  );
  const successful = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const failures = results.flatMap((result, index) => result.status === "rejected"
    ? [{ group: env.CELESTRAK_GROUPS[index], error: result.reason }]
    : []);

  if (successful.length === 0) {
    throw new AggregateError(failures.map((failure) => failure.error), "Every CelesTrak group request failed");
  }

  if (failures.length > 0) {
    logger.warn({ failures }, "Some CelesTrak groups failed; cached records will be retained");
  }

  const fresh = successful.filter((result) => result.state === "fresh");
  return {
    state: fresh.length > 0 ? "fresh" : "cached",
    records: deduplicate(fresh.flatMap((result) => result.records)),
    httpStatus: fresh.length > 0 ? fresh[0].httpStatus : successful[0].httpStatus,
  };
};

export const fetchSatcatData = (): Promise<CelestrakFetchResult<SatcatRecord>> => fetchCelestrakGroups(
  env.CELESTRAK_SATCAT_URL,
  "application/json",
  (payload) => parseSatcatData(JSON.parse(payload)),
  deduplicateSatcatRecords,
);

export const fetchTleData = (): Promise<CelestrakFetchResult<TleRecord>> => fetchCelestrakGroups(
  env.CELESTRAK_TLE_URL,
  "text/plain",
  parseTleData,
  deduplicateTleRecords,
);

const errorMessage = (reason: unknown): string =>
  reason instanceof Error ? reason.message : String(reason);

export const syncCelestrakData = async (): Promise<CelestrakSyncSummary> => {
  const [satcatResult, tleResult] = await Promise.allSettled([
    fetchSatcatData(),
    fetchTleData(),
  ]);

  const cache = await getCelestrakCacheSummary();

  const freshSatcatRecords = satcatResult.status === "fulfilled"
    && satcatResult.value.state === "fresh"
    ? satcatResult.value.records
    : [];

  let satcatSummary: CelestrakSourceSummary;
  if (satcatResult.status === "rejected") {
    satcatSummary = {
      state: "failed" as const,
      records: cache.satellites,
      error: errorMessage(satcatResult.reason),
    };
  } else if (satcatResult.value.state === "cached") {
    satcatSummary = { state: "cached" as const, records: cache.satellites };
  } else {
    try {
      satcatSummary = {
        state: "updated" as const,
        records: await upsertSatcatRecords(satcatResult.value.records),
      };
    } catch (error) {
      satcatSummary = {
        state: "failed" as const,
        records: cache.satellites,
        error: errorMessage(error),
      };
    }
  }

  const satcatByNoradId = new Map(
    freshSatcatRecords.map((record) => [record.noradCatId, record]),
  );

  let tleSummary: CelestrakSourceSummary;
  if (tleResult.status === "rejected") {
    tleSummary = {
      state: "failed" as const,
      records: cache.tleRecords,
      error: errorMessage(tleResult.reason),
    };
  } else if (tleResult.value.state === "cached") {
    tleSummary = { state: "cached" as const, records: cache.tleRecords };
  } else {
    const records = tleResult.value.records.map((record) => {
      const satcat = satcatByNoradId.get(record.noradCatId);
      return {
        ...record,
        apogeeKm: satcat?.apogeeKm ?? null,
        perigeeKm: satcat?.perigeeKm ?? null,
        inclinationDegrees: satcat?.inclinationDegrees ?? record.inclinationDegrees,
        orbitalPeriodMinutes: satcat?.orbitalPeriodMinutes ?? record.orbitalPeriodMinutes,
      };
    });

    try {
      tleSummary = {
        state: "updated" as const,
        records: await upsertTleRecords(records),
      };
    } catch (error) {
      tleSummary = {
        state: "failed" as const,
        records: cache.tleRecords,
        error: errorMessage(error),
      };
    }
  }

  return { satcat: satcatSummary, tle: tleSummary };
};
