import type { Request } from "express";

export interface AuthenticatedRequest extends Request {
  authUserId?: string;
}
