import { type Request, type Response } from "express";
import { serverReadyCheck } from "./health.services.ts";

export const serverHealth = (req: Request, res: Response) => {
  return res.status(200).json({
    message: "Express server is healthy"
  });
}

export const serverReady = async (req: Request, res: Response) => {
  const checkStatus = await serverReadyCheck();

  if (checkStatus.status === "not_ready") {
    return res.status(503).json(checkStatus);
  }
  else {
    return res.status(200).json(checkStatus);
  }
}
