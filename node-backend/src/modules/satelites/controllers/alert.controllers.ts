import { NextFunction, Request, Response } from "express";
import { AlertRecord } from "../types.ts";
import {
  acknowledgeAlert,
  AlertNotFoundError,
  createAlert,
  getAlerts,
  resolveAlert,
} from "../services/alert.services.ts";
import {
  alertCreateRequestSchema,
  alertListQuerySchema,
  alertParamsSchema,
} from "../validation/alert.validation.ts";

export const listAlerts = async (req: Request, res: Response, next: NextFunction) => {
  const query = alertListQuerySchema.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: "Invalid alert query", issues: query.error.issues });

  try {
    return res.status(200).json({ data: await getAlerts(query.data) });
  } catch (error) {
    return next(error);
  }
};

export const createOperationsAlert = async (req: Request, res: Response, next: NextFunction) => {
  const request = alertCreateRequestSchema.safeParse(req.body);
  if (!request.success) return res.status(400).json({ error: "Invalid alert request", issues: request.error.issues });

  try {
    return res.status(201).json({ data: await createAlert(request.data) });
  } catch (error) {
    return next(error);
  }
};

const updateAlert = async (req: Request, res: Response, next: NextFunction, operation: (alertId: string) => Promise<AlertRecord>) => {
  const params = alertParamsSchema.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid alert ID", issues: params.error.issues });

  try {
    return res.status(200).json({ data: await operation(params.data.alertId) });
  } catch (error) {
    if (error instanceof AlertNotFoundError) return res.status(404).json({ error: error.message });
    return next(error);
  }
};

export const acknowledgeOperationsAlert = async (req: Request, res: Response, next: NextFunction) => updateAlert(req, res, next, acknowledgeAlert);

export const resolveOperationsAlert = async (req: Request, res: Response, next: NextFunction) => updateAlert(req, res, next, resolveAlert);
