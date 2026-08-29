import { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../../../auth/types.ts";
import { SatelliteNotFoundError } from "../services/satellite-read.errors.ts";
import {
  addSatelliteToWishlist,
  deleteSatelliteFromWishlist,
  getUserWishlist,
} from "../services/wishlist.services.ts";
import { wishlistSatelliteParamsSchema } from "../validation/wishlist.validation.ts";

const handleWishlistError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof SatelliteNotFoundError) {
    return res.status(404).json({ error: error.message });
  }
  return next(error);
};

export const listUserWishlist = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const satellites = await getUserWishlist(req.authUserId as string);
    return res.status(200).json({ data: { satellites, count: satellites.length } });
  } catch (error) {
    return handleWishlistError(error, res, next);
  }
};

export const addUserWishlistSatellite = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const params = wishlistSatelliteParamsSchema.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid wishlist request", issues: params.error.issues });

  try {
    return res.status(201).json({ data: await addSatelliteToWishlist(req.authUserId as string, params.data.noradCatId) });
  } catch (error) {
    return handleWishlistError(error, res, next);
  }
};

export const removeUserWishlistSatellite = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const params = wishlistSatelliteParamsSchema.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid wishlist request", issues: params.error.issues });

  try {
    await deleteSatelliteFromWishlist(req.authUserId as string, params.data.noradCatId);
    return res.status(204).send();
  } catch (error) {
    return handleWishlistError(error, res, next);
  }
};
