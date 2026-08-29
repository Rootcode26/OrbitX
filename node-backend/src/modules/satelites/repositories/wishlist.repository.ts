import { db } from "../../../db/index.ts";
import { WishlistSatelliteDatabaseRow } from "../types.ts";
import type { ClerkUserDatabaseRow } from "./types.ts";

const wishlistSatelliteSelect = `
  satellite.norad_cat_id,
  satellite.satellite_name,
  satellite.object_type,
  satellite.owner,
  satellite.operational_status,
  wishlist.created_at
`;

const ensureClerkUserQuery = `
  INSERT INTO user_details (clerk_user_id)
  VALUES ($1)
  ON CONFLICT (clerk_user_id) DO UPDATE
  SET clerk_user_id = EXCLUDED.clerk_user_id
  RETURNING id
`;

const wishlistSatelliteExistsQuery = `
  SELECT EXISTS(SELECT 1 FROM satellites WHERE norad_cat_id = $1) AS exists
`;

const addWishlistSatelliteQuery = `
  INSERT INTO user_satellite_wishlist (user_id, satellite_id)
  SELECT user_details.id, satellite.id
  FROM user_details
  CROSS JOIN satellites satellite
  WHERE user_details.id = $1
    AND satellite.norad_cat_id = $2
  ON CONFLICT (user_id, satellite_id) DO NOTHING
`;

const wishlistSatelliteQuery = `
  SELECT ${wishlistSatelliteSelect}
  FROM user_satellite_wishlist wishlist
  JOIN satellites satellite ON satellite.id = wishlist.satellite_id
  WHERE wishlist.user_id = $1
    AND satellite.norad_cat_id = $2
`;

const wishlistQuery = `
  SELECT ${wishlistSatelliteSelect}
  FROM user_satellite_wishlist wishlist
  JOIN satellites satellite ON satellite.id = wishlist.satellite_id
  WHERE wishlist.user_id = $1
  ORDER BY wishlist.created_at DESC, satellite.norad_cat_id ASC
`;

const removeWishlistSatelliteQuery = `
  DELETE FROM user_satellite_wishlist wishlist
  USING satellites satellite
  WHERE wishlist.user_id = $1
    AND wishlist.satellite_id = satellite.id
    AND satellite.norad_cat_id = $2
  RETURNING wishlist.user_id
`;

export const ensureClerkUser = async (clerkUserId: string): Promise<string> => {
  const result = await db.query<ClerkUserDatabaseRow>(ensureClerkUserQuery, [clerkUserId]);
  return result.rows[0].id;
};

export const wishlistSatelliteExists = async (noradCatId: number): Promise<boolean> => {
  const result = await db.query<{ exists: boolean }>(wishlistSatelliteExistsQuery, [noradCatId]);
  return result.rows[0]?.exists ?? false;
};

export const insertWishlistSatellite = async (userId: string, noradCatId: number): Promise<WishlistSatelliteDatabaseRow> => {
  await db.query(addWishlistSatelliteQuery, [userId, noradCatId]);
  const result = await db.query<WishlistSatelliteDatabaseRow>(wishlistSatelliteQuery, [userId, noradCatId]);
  return result.rows[0];
};

export const findWishlist = async (userId: string): Promise<WishlistSatelliteDatabaseRow[]> => {
  const result = await db.query<WishlistSatelliteDatabaseRow>(wishlistQuery, [userId]);
  return result.rows;
};

export const removeWishlistSatellite = async (userId: string, noradCatId: number): Promise<boolean> => {
  const result = await db.query(removeWishlistSatelliteQuery, [userId, noradCatId]);
  return (result.rowCount ?? 0) > 0;
};
