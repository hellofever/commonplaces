import type { Tag } from "./tags";

export interface OpeningPeriod {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
}

export interface Restaurant {
  id: string;
  name: string;
  primary_tag_id: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  price_level: number | null;
  opening_hours: OpeningPeriod[] | null;
  google_place_id: string | null;
  notes: string | null;
  photo_url: string | null;
  is_favourite: boolean;
  destination_id: string;
  created_at: string;
  updated_at: string;

  // Derived from the restaurant_tags join + primary_tag_id -- not raw columns.
  // See lib/restaurants.ts for how these get assembled from the Supabase query.
  // `types` (kind='type', mandatory, max 3, drives pin color) is distinct from
  // `tags` (kind='tags', freeform cuisine/food-type, no cap, no color/icon).
  primaryTag: Tag | null;
  types: Tag[];
  tags: Tag[];
  areas: Tag[];
}

export interface RestaurantPhoto {
  id: string;
  restaurant_id: string;
  storage_path: string;
  created_at: string;
}

// Shape used for create/update -- scalar fields plus tag selections as plain id
// arrays/values, which lib/restaurants.ts syncs into restaurant_tags separately.
// destination_id isn't a form field (see AddRestaurantFlow) -- RestaurantForm produces
// RestaurantFormValues, and the caller injects destination_id before calling
// insertRestaurant/updateRestaurant.
export interface RestaurantInput {
  name: string;
  primary_tag_id: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  price_level: number | null;
  opening_hours: OpeningPeriod[] | null;
  google_place_id: string | null;
  notes: string | null;
  photo_url: string | null;
  typeIds: string[];
  tagIds: string[];
  areaIds: string[];
  destination_id: string;
}

export type RestaurantFormValues = Omit<RestaurantInput, "destination_id">;
