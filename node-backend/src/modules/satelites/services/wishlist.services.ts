import {
  ensureClerkUser,
  findWishlist,
  insertWishlistSatellite,
  removeWishlistSatellite,
  wishlistSatelliteExists,
} from "../repositories/wishlist.repository.ts";
import {
  WishlistSatellite,
  WishlistSatelliteDatabaseRow,
} from "../types.ts";
import { SatelliteNotFoundError } from "./satellite-read.errors.ts";

const toWishlistSatellite = (row: WishlistSatelliteDatabaseRow): WishlistSatellite => ({
  norad_cat_id: row.norad_cat_id,
  name: row.satellite_name,
  object_type: row.object_type,
  owner: row.owner,
  operational_status: row.operational_status,
  added_at: row.created_at.toISOString(),
});

const requireWishlistSatellite = async (noradCatId: number) => {
  if (!(await wishlistSatelliteExists(noradCatId))) throw new SatelliteNotFoundError(noradCatId);
};

export const getUserWishlist = async (clerkUserId: string): Promise<WishlistSatellite[]> => {
  const userId = await ensureClerkUser(clerkUserId);
  const rows = await findWishlist(userId);
  return rows.map(toWishlistSatellite);
};

export const addSatelliteToWishlist = async (clerkUserId: string, noradCatId: number): Promise<WishlistSatellite> => {
  await requireWishlistSatellite(noradCatId);
  const userId = await ensureClerkUser(clerkUserId);
  return toWishlistSatellite(await insertWishlistSatellite(userId, noradCatId));
};

export const deleteSatelliteFromWishlist = async (clerkUserId: string, noradCatId: number): Promise<void> => {
  await requireWishlistSatellite(noradCatId);
  const userId = await ensureClerkUser(clerkUserId);
  await removeWishlistSatellite(userId, noradCatId);
};
