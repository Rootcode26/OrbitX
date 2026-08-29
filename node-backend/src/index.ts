import express, { Application } from "express"
import { env } from "./config/env";
import { pinoHttp } from "pino-http"
import logger from "./config/logger";
import helmet from "helmet"
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes/index.ts"
import { closePool } from "./db/index.ts";
import {
  fetchCelesTrakData,
  fetchSgp4PropagationData,
  stopScheduledTasks,
} from "./scheduler/index.ts";

const app: Application = express();
const PORT = env.PORT

app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || env.CORS_ALLOWED_ORIGINS.includes(origin));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86_400,
}));
app.use(pinoHttp({ logger }));
app.use(express.json())

if (env.CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware({
    authorizedParties: env.CORS_ALLOWED_ORIGINS,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
  }));
} else {
  logger.warn("Clerk is not configured; authenticated routes will return 503");
}

app.use("/api/v1", router);

const scheduledTasks = [
  fetchCelesTrakData(),
  fetchSgp4PropagationData(),
];

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "Express server started");
});

let shuttingDown = false;
async function shutdown(signal: "SIGTERM" | "SIGINT") {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`received ${signal}, shutting down`);

  const force = setTimeout(() => process.exit(1), 10_000);

  try {
    await stopScheduledTasks(scheduledTasks);
  } catch (err) {
    logger.error({ err }, "Failed to stop scheduled tasks cleanly");
  }

  server.close(async () => {
    try {
      await closePool();
    } finally {
      clearTimeout(force);
      process.exit(0);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
