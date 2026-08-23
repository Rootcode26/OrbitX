import dotenv from "dotenv";

dotenv.config();

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
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTRGES_DB: process.env.POSTGRES_DB,
  POSTGRES_PORT: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
  DATABASE_URL:process.env.DATABASE_URL
}
