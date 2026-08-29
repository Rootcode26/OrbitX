"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrbitAuth } from "@/providers/auth-provider";
import { addWishlistSatellite, fetchWishlist, removeWishlistSatellite } from "./api";
import type { WishlistStore } from "./types";

const wishlistQueryKey = ["wishlist"] as const;

export function useWishlist(): WishlistStore {
  const auth = useOrbitAuth();
  const queryClient = useQueryClient();
  const wishlist = useQuery({
    queryKey: wishlistQueryKey,
    queryFn: async () => {
      const token = await auth.getToken();
      if (!token) throw new Error("Authentication required");
      return fetchWishlist(token);
    },
    enabled: auth.configured && auth.isLoaded && auth.isSignedIn,
  });
  const objectIds = useMemo(
    () => wishlist.data?.map((satellite) => satellite.norad_cat_id) ?? [],
    [wishlist.data],
  );
  const mutation = useMutation({
    mutationFn: async (objectId: number) => {
      const token = await auth.getToken();
      if (!token) throw new Error("Authentication required");
      if (objectIds.includes(objectId)) {
        await removeWishlistSatellite(token, objectId);
      } else {
        await addWishlistSatellite(token, objectId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wishlistQueryKey }),
  });

  const toggle = useCallback((objectId: number) => {
    if (!auth.configured || !auth.isSignedIn) {
      auth.openSignIn();
      return;
    }
    mutation.mutate(objectId);
  }, [auth, mutation]);

  return {
    objectIds,
    isAuthenticated: auth.isSignedIn,
    isLoading: !auth.isLoaded || (auth.isSignedIn && wishlist.isPending),
    includes: useCallback((objectId: number) => objectIds.includes(objectId), [objectIds]),
    requestSignIn: auth.openSignIn,
    toggle,
  };
}
