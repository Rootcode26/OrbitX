import express, { Application } from "express"
import { env } from "./config/env";
import { pinoHttp } from "pino-http"
import logger from "./config/logger";
import helmet from "helmet"
import router from "./routes/index.ts"
import { closePool } from "./db/index.ts";
import { fetchSgp4PropagationData } from "./scheduler/index.ts";

const app: Application = express();
const PORT = env.PORT

app.use(helmet())
app.use(pinoHttp({ logger }));
app.use(express.json())

app.use("/api/v1", router);

fetchSgp4PropagationData()

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "Express server started");
});

let shuttingDown = false;
async function shutdown(signal: "SIGTERM" | "SIGINT") {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`received ${signal}, shutting down`);

  const force = setTimeout(() => process.exit(1), 10_000);

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
