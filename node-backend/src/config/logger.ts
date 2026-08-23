import pino from "pino";
import { env } from "./env";

const isProduction = env.NODE_ENV === "production";

const logger = pino({
  level: isProduction ? "info" : env.PINO_LOG_LEVEL,
  formatters: {
    level: (label) => {
      return { severity: label.toUpperCase() };
    },
  },
  transport: !isProduction
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss.l",
          ignore: "pid,hostname,service",
          messageFormat: "{msg}",
          colorizeObjects: true,
        },
      }
    : undefined,

  base: {
    service: "orbitX-api",
    env: env.NODE_ENV,
  },

  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },

  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "*.password",
      "req.body.email",
      "*.email",
    ],
    ...(isProduction ? { remove: true } : { censor: "[REDACTED]" }),
  },

  timestamp: pino.stdTimeFunctions.isoTime,
  messageKey: "msg",
});

export default logger;
