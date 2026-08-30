import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { globalErrorHandler, notFoundHandler } from "../src/middleware/http-error.middleware.ts";

type ResponseState = {
  body?: unknown;
  status: number;
};

const createRequest = (method: string, path: string): Request => ({
  method,
  originalUrl: path,
} as Request);

const createResponse = (): { response: Response; state: ResponseState } => {
  const state: ResponseState = { status: 200 };
  const response = {
    headersSent: false,
    status(code: number) {
      state.status = code;
      return this;
    },
    json(body: unknown) {
      state.body = body;
      return this;
    },
  } as Response;

  return { response, state };
};

const unexpectedNext: NextFunction = (error?: unknown) => {
  throw error ?? new Error("Middleware unexpectedly called next");
};

test("unknown routes return a JSON 404 response", () => {
  const req = createRequest("GET", "/missing");
  const { response, state } = createResponse();

  notFoundHandler(req, response, unexpectedNext);

  assert.equal(state.status, 404);
  assert.deepEqual(state.body, {
    error: "Route not found",
    code: "NOT_FOUND",
    method: "GET",
    path: "/missing",
  });
});

test("malformed request bodies return a JSON 400 response", () => {
  const req = createRequest("POST", "/echo");
  const { response, state } = createResponse();
  const error = Object.assign(new SyntaxError("Unexpected end of JSON input"), {
    status: 400,
    body: "{",
  });

  globalErrorHandler(error, req, response, unexpectedNext);

  assert.equal(state.status, 400);
  assert.deepEqual(state.body, {
    error: "Request body contains invalid JSON",
    code: "INVALID_JSON",
  });
});

test("unexpected errors do not expose internal details", () => {
  const req = createRequest("GET", "/boom");
  const { response, state } = createResponse();

  globalErrorHandler(new Error("private failure details"), req, response, unexpectedNext);

  assert.equal(state.status, 500);
  assert.deepEqual(state.body, {
    error: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
  });
});
