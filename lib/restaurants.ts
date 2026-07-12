import { supabase } from "./supabase";
import type { Restaurant, RestaurantInput } from "./types";

export async function fetchRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data as Restaurant[];
}

export async function insertRestaurant(input: RestaurantInput): Promise<Restaurant> {
  const { data, error } = await supabase.from("restaurants").insert(input).select().single();

  if (error) throw error;
  return data as Restaurant;
}

export async function updateRestaurant(
  id: string,
  input: Partial<RestaurantInput>
): Promise<Restaurant> {
  const { data, error } = await supabase
    .from("restaurants")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Restaurant;
}

export async function findByPlaceId(placeId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("google_place_id", placeId)
    .maybeSingle();

  if (error) throw error;
  return data as Restaurant | null;
}
