import dotenv from "dotenv";

dotenv.config();

const defaultCelestrakGroups = [
  "ACTIVE",
  "FENGYUN-1C-DEBRIS",
  "IRIDIUM-33-DEBRIS",
  "COSMOS-2251-DEBRIS",
];

const readCsv = (value: string | undefined, fallback: string[]): string[] => Array.from(new Set(
  (value ? value.split(",") : fallback)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean),
));

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  PINO_LOG_LEVEL: process.env.PINO_LOG_LEVEL || "info",
  CORS_ALLOWED_ORIGINS: (process.env.CORS_ALLOWED_ORIGINS
    || "http://localhost:3000,http://127.0.0.1:3000,http://100.68.65.0:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTRGES_DB: process.env.POSTGRES_DB,
  POSTGRES_PORT: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
  DATABASE_URL:process.env.DATABASE_URL,
  CELESTRAK_SATCAT_URL: process.env.CELESTRAK_SATCAT_URL
    || "https://celestrak.org/satcat/records.php?GROUP=ACTIVE&FORMAT=JSON",
  CELESTRAK_TLE_URL: process.env.CELESTRAK_TLE_URL
    || "https://celestrak.org/NORAD/elements/gp.php?GROUP=ACTIVE&FORMAT=TLE",
  CELESTRAK_GROUPS: readCsv(process.env.CELESTRAK_GROUPS, defaultCelestrakGroups),
  CELESTRAK_USER_AGENT: process.env.CELESTRAK_USER_AGENT || "OrbitX/1.0",
  CELESTRAK_SYNC_CRON: process.env.CELESTRAK_SYNC_CRON || "0 */2 * * *",
  SGP4_PROPAGATION_CRON: process.env.SGP4_PROPAGATION_CRON || "*/1 * * * *",
  PROPAGATION_URL: process.env.PROPAGATION_URL
    || "http://100.100.176.22:8000/propagation",
  SATELLITE_CURRENT_STATE_URL: process.env.SATELLITE_CURRENT_STATE_URL
    || "http://100.100.176.22:8000/api/satellite-state/current",
  PROPAGATION_REQUEST_TIMEOUT_MS: parseInt(
    process.env.PROPAGATION_REQUEST_TIMEOUT_MS || "30000",
    10,
  ),
  CONJUNCTION_CHECK_URL: process.env.CONJUNCTION_CHECK_URL
    || "http://100.100.176.22:8000/api/conjunctions/check",
  CONJUNCTION_REQUEST_TIMEOUT_MS: parseInt(
    process.env.CONJUNCTION_REQUEST_TIMEOUT_MS || "30000",
    10,
  ),
  CELESTRAK_REQUEST_TIMEOUT_MS: parseInt(
    process.env.CELESTRAK_REQUEST_TIMEOUT_MS || "30000",
    10,
  ),
}
