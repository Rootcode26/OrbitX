import { getAuth } from "@clerk/express";
import type { NextFunction, Response } from "express";
import { env } from "../config/env.ts";
import type { AuthenticatedRequest } from "./types.ts";

export function requireClerkAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!env.CLERK_PUBLISHABLE_KEY || !env.CLERK_SECRET_KEY) {
    return res.status(503).json({ error: "Authentication is not configured" });
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  req.authUserId = userId;
  return next();
}
