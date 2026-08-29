import { requestJson, requestVoid } from "@/lib/api/client";
import type { WishlistResponse, WishlistSatellite } from "./types";

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchWishlist(token: string): Promise<WishlistSatellite[]> {
  const response = await requestJson<WishlistResponse>("/satellites/info/wishlist", {
    headers: authHeaders(token),
  });
  return response.data.satellites;
}

export async function addWishlistSatellite(token: string, noradCatId: number): Promise<WishlistSatellite> {
  const response = await requestJson<{ data: WishlistSatellite }>(`/satellites/info/wishlist/${noradCatId}`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return response.data;
}

export async function removeWishlistSatellite(token: string, noradCatId: number): Promise<void> {
  await requestVoid(`/satellites/info/wishlist/${noradCatId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}
