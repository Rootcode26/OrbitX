import { env } from "../config/env";
import { Pool } from "pg";
import logger from "../config/logger";
import { CONNECTION_TMEOUT_MILLIS, IDLE_TIMEOUT_MILLIS, MAX_POOL_SIZE } from "../constants";

export const db: Pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: MAX_POOL_SIZE,
  idleTimeoutMillis: IDLE_TIMEOUT_MILLIS,
  connectionTimeoutMillis: CONNECTION_TMEOUT_MILLIS,
});

const dbLogger = logger.child({ port: env.POSTGRES_PORT });

db.on("connect", () => {
  dbLogger.info("Database is connected");
});

db.on("error", (err) => {
  dbLogger.error({ err }, "Unexpected DB error");
  process.exit(-1);
});

export const pingDB = async () => {
  await db.query("SELECT 1");
}

export const closePool = async () => {
  await db.end()
}
