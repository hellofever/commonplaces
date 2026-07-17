import { supabase } from "./supabase";

export interface Destination {
  id: string;
  name: string;
  google_place_id: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

// Ordered oldest-first so the original/default destination sorts first -- used both for
// the switcher's listing and as the fallback when the URL has no ?destination= param.
export async function fetchDestinations(): Promise<Destination[]> {
  const { data, error } = await supabase
    .from("destinations")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Destination[];
}

export async function createDestination(input: {
  name: string;
  googlePlaceId: string;
  lat: number;
  lng: number;
}): Promise<Destination> {
  const { data, error } = await supabase
    .from("destinations")
    .insert({ name: input.name, google_place_id: input.googlePlaceId, lat: input.lat, lng: input.lng })
    .select()
    .single();

  if (error) throw error;
  return data as Destination;
}
