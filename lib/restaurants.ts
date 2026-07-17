import { supabase } from "./supabase";
import type { Tag } from "./tags";
import type { Restaurant, RestaurantInput } from "./types";

const RESTAURANT_SELECT = `
  *,
  primary_tag:tags!restaurants_primary_tag_id_fkey(id, kind, name, color, icon),
  restaurant_tags(tag:tags(id, kind, name, color, icon))
`;

interface RawRestaurantRow {
  restaurant_tags?: { tag: Tag }[];
  primary_tag?: Tag | null;
  [key: string]: unknown;
}

function normalize(row: RawRestaurantRow): Restaurant {
  const allTags = (row.restaurant_tags ?? []).map((rt) => rt.tag);
  const { restaurant_tags: _restaurantTags, primary_tag, ...rest } = row;
  return {
    ...(rest as Omit<Restaurant, "primaryTag" | "types" | "tags" | "areas">),
    primaryTag: primary_tag ?? null,
    types: allTags.filter((t) => t.kind === "type"),
    tags: allTags.filter((t) => t.kind === "tags"),
    areas: allTags.filter((t) => t.kind === "area"),
  };
}

export async function fetchRestaurants(destinationId: string): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from("restaurants")
    .select(RESTAURANT_SELECT)
    .eq("destination_id", destinationId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as unknown as RawRestaurantRow[]).map(normalize);
}

export async function fetchRestaurantById(id: string): Promise<Restaurant> {
  const { data, error } = await supabase
    .from("restaurants")
    .select(RESTAURANT_SELECT)
    .eq("id", id)
    .single();

  if (error) throw error;
  return normalize(data as unknown as RawRestaurantRow);
}

// Full replace of a restaurant's type/tags/area join rows. Callers must pass the
// COMPLETE set of ids (all three kinds combined) -- there's one join table for all
// three kinds, so a partial list here would silently drop the other kinds. When only
// one kind is being edited (e.g. the Sheet's Tags cell), combine the new ids for that
// kind with the restaurant's existing ids for the other two before calling this.
export async function updateRestaurantTags(restaurantId: string, tagIds: string[]): Promise<void> {
  // One transactional RPC (see 0005_replace_restaurant_tags_fn.sql) rather than
  // delete-then-insert from the client, which could strip all tags if the insert failed.
  const { error } = await supabase.rpc("replace_restaurant_tags", {
    p_restaurant_id: restaurantId,
    p_tag_ids: tagIds,
  });
  if (error) throw error;
}

// Mirrors RestaurantForm's auto-pick effect (auto-assign when there's exactly one tag,
// keep the current primary if it's still selected, otherwise fall back to the first
// remaining tag) -- callers that change a restaurant's tags outside that form (e.g. the
// Sheet's Tags cell/picker) need to run this themselves, or primary_tag_id goes stale
// and the map pin falls back to its default grey/fork-knife look.
export function derivePrimaryTagId(currentPrimaryTagId: string | null, newTagIds: string[]): string | null {
  if (newTagIds.length === 0) return null;
  if (currentPrimaryTagId && newTagIds.includes(currentPrimaryTagId)) return currentPrimaryTagId;
  return newTagIds[0];
}

export async function updateRestaurantPrimaryTag(
  restaurantId: string,
  primaryTagId: string | null
): Promise<void> {
  const { error } = await supabase
    .from("restaurants")
    .update({ primary_tag_id: primaryTagId })
    .eq("id", restaurantId);
  if (error) throw error;
}

function splitInput(input: RestaurantInput) {
  const { typeIds, tagIds, areaIds, ...scalar } = input;
  const allTagIds = [...typeIds, ...tagIds, ...areaIds];
  return { scalar, allTagIds };
}

export async function insertRestaurant(input: RestaurantInput): Promise<Restaurant> {
  const { scalar, allTagIds } = splitInput(input);
  const { data, error } = await supabase.from("restaurants").insert(scalar).select().single();
  if (error) throw error;

  await updateRestaurantTags(data.id, allTagIds);
  return fetchRestaurantById(data.id);
}

export async function updateRestaurant(id: string, input: RestaurantInput): Promise<Restaurant> {
  const { scalar, allTagIds } = splitInput(input);
  const { error } = await supabase.from("restaurants").update(scalar).eq("id", id);
  if (error) throw error;

  await updateRestaurantTags(id, allTagIds);
  return fetchRestaurantById(id);
}

export async function setFavourite(id: string, value: boolean): Promise<void> {
  const { error } = await supabase.from("restaurants").update({ is_favourite: value }).eq("id", id);
  if (error) throw error;
}

// Direct scalar-field patch for inline Sheet-cell edits -- skips the tag-sync dance
// entirely since types/tags/areas aren't scalar columns.
export async function patchRestaurant(
  id: string,
  fields: Partial<
    Pick<
      RestaurantInput,
      "name" | "address" | "lat" | "lng" | "phone" | "website" | "price_level" | "notes"
    >
  >
): Promise<void> {
  const { error } = await supabase.from("restaurants").update(fields).eq("id", id);
  if (error) throw error;
}

export async function deleteRestaurants(ids: string[]): Promise<void> {
  const { error } = await supabase.from("restaurants").delete().in("id", ids);
  if (error) throw error;
}

export async function findByPlaceId(placeId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from("restaurants")
    .select(RESTAURANT_SELECT)
    .eq("google_place_id", placeId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalize(data as unknown as RawRestaurantRow) : null;
}
