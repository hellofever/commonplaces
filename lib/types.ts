import type { RestaurantCategory } from "./categories";

export interface OpeningPeriod {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
}

export interface Restaurant {
  id: string;
  name: string;
  category: RestaurantCategory;
  lat: number;
  lng: number;
  address: string;
  phone: string | null;
  website: string | null;
  price_level: number | null;
  opening_hours: OpeningPeriod[] | null;
  google_place_id: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export type RestaurantInput = Omit<Restaurant, "id" | "created_at" | "updated_at">;
