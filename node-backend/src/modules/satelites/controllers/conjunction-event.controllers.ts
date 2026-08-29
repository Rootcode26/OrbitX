import { NextFunction, Request, Response } from "express";
import {
  ConjunctionEventNotFoundError,
  getConjunctionAnalytics,
  getConjunctionEvent,
  getConjunctionEventPage,
} from "../services/conjunction-event.services.ts";
import {
  conjunctionAnalyticsQuerySchema,
  conjunctionEventListQuerySchema,
  conjunctionEventParamsSchema,
} from "../validation/conjunction-event.validation.ts";

export const listConjunctionEvents = async (req: Request, res: Response, next: NextFunction) => {
  const query = conjunctionEventListQuerySchema.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: "Invalid conjunction event query", issues: query.error.issues });

  try {
    return res.status(200).json({ data: await getConjunctionEventPage(query.data) });
  } catch (error) {
    return next(error);
  }
};

export const getConjunctionEventDetails = async (req: Request, res: Response, next: NextFunction) => {
  const params = conjunctionEventParamsSchema.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid conjunction event ID", issues: params.error.issues });

  try {
    return res.status(200).json({ data: await getConjunctionEvent(params.data.eventId) });
  } catch (error) {
    if (error instanceof ConjunctionEventNotFoundError) return res.status(404).json({ error: error.message });
    return next(error);
  }
};

export const getConjunctionAnalyticsData = async (req: Request, res: Response, next: NextFunction) => {
  const query = conjunctionAnalyticsQuerySchema.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: "Invalid conjunction analytics query", issues: query.error.issues });

  try {
    return res.status(200).json({ data: await getConjunctionAnalytics(query.data.days) });
  } catch (error) {
    return next(error);
  }
};
