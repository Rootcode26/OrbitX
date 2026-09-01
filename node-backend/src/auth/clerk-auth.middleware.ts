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

// Populates req.authUserId when a valid session is present but never rejects the
// request. Used on otherwise-public read endpoints so owners can see their own
// private (commissioned) satellites while anonymous callers see only public data.
export function optionalClerkAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (env.CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY) {
    const { userId } = getAuth(req);
    if (userId) {
      req.authUserId = userId;
    }
  }

  return next();
}
