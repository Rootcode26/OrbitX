export interface WishlistStore {
  objectIds: number[];
  isAuthenticated: boolean;
  isLoading: boolean;
  includes: (objectId: number) => boolean;
  requestSignIn: () => void;
  toggle: (objectId: number) => void;
}

export interface WishlistSatellite {
  norad_cat_id: number;
  name: string;
  object_type: string | null;
  owner: string | null;
  operational_status: string | null;
  added_at: string;
}

export interface WishlistResponse {
  data: {
    satellites: WishlistSatellite[];
    count: number;
  };
}
