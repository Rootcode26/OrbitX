import type { ErrorRequestHandler, RequestHandler } from "express";
import logger from "../config/logger.ts";

type HttpError = Error & {
  body?: unknown;
  expose?: boolean;
  status?: number;
  statusCode?: number;
};

const statusCodeFor = (error: HttpError): number => {
  const status = error.status ?? error.statusCode;
  return typeof status === "number" && status >= 400 && status <= 599 ? status : 500;
};

const isMalformedJson = (error: HttpError): boolean =>
  error instanceof SyntaxError && error.status === 400 && "body" in error;

const errorCodeFor = (status: number): string => {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "UNPROCESSABLE_ENTITY";
  if (status === 429) return "TOO_MANY_REQUESTS";
  return status >= 500 ? "INTERNAL_SERVER_ERROR" : `HTTP_${status}`;
};

export const notFoundHandler: RequestHandler = (req, res) => {
  return res.status(404).json({
    error: "Route not found",
    code: "NOT_FOUND",
    method: req.method,
    path: req.originalUrl,
  });
};

export const globalErrorHandler: ErrorRequestHandler = (error: HttpError, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (isMalformedJson(error)) {
    return res.status(400).json({
      error: "Request body contains invalid JSON",
      code: "INVALID_JSON",
    });
  }

  const status = statusCodeFor(error);
  const canExposeMessage = status < 500 || error.expose === true;
  const message = canExposeMessage && error.message ? error.message : "Internal server error";

  if (status >= 500) {
    logger.error(
      { err: error, method: req.method, path: req.originalUrl },
      "Unhandled request error",
    );
  }

  return res.status(status).json({
    error: message,
    code: errorCodeFor(status),
  });
};
