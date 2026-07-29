import type { ComponentType } from "react";
import * as PhosphorIcons from "@phosphor-icons/react";
import { supabase } from "./supabase";
import { isTypeHue, mapColorVar, tagColorVar, TYPE_HUES, type TypeHue } from "./colorTokens";

// Loose lookup-by-name so a tag's icon (see TAG_ICONS below) resolves to its component
// without an import per icon -- PhosphorIcons is typed loosely here because its module
// namespace mixes icon components with other exports (e.g. IconContext) that don't
// share the icon component's props shape. Shared by MapView (pin icon), TagPicker (the
// create-icon swatches), and TagPills (tag pill icon) so there's one lookup, not three.
export const PHOSPHOR_ICON_MAP = PhosphorIcons as unknown as Record<
  string,
  ComponentType<{ size?: number; weight?: string; color?: string; className?: string }>
>;

export type TagKind = "type" | "tags" | "area";

export interface Tag {
  id: string;
  kind: TagKind;
  name: string;
  color: string | null;
  icon: string | null;
  // Scopes an "area"/"tags" row to the destination it belongs to -- always null for
  // "type" rows, which stay one taxonomy shared by every destination. See
  // 0012_scope_area_tags_to_destination.sql.
  destination_id: string | null;
  created_at: string;
}

// Type is one global taxonomy (destinationId is ignored); area/tags are scoped per
// destination, so a null/missing destinationId can't return anything meaningful for
// them -- an empty list rather than every destination's values.
export async function fetchTags(kind: TagKind, destinationId?: string | null): Promise<Tag[]> {
  let query = supabase.from("tags").select("*").eq("kind", kind);
  if (kind === "type") {
    query = query.is("destination_id", null);
  } else {
    if (!destinationId) return [];
    query = query.eq("destination_id", destinationId);
  }
  const { data, error } = await query.order("name", { ascending: true });

  if (error) throw error;
  return data as Tag[];
}

// destinationId is required for area/tags kinds, ignored (always stored as null) for
// type -- callers can pass whatever destinationId they have on hand regardless of kind.
export async function createTag(
  kind: TagKind,
  name: string,
  destinationId?: string | null,
  icon?: string | null,
  color?: TypeHue | null
): Promise<Tag> {
  if (kind !== "type" && !destinationId) {
    throw new Error(`Cannot create a "${kind}" tag without a destination.`);
  }
  const resolvedColor = kind === "type" ? (color ?? (await nextPaletteColor())) : null;
  const { data, error } = await supabase
    .from("tags")
    .insert({
      kind,
      name,
      color: resolvedColor,
      icon: kind === "type" ? (icon ?? null) : null,
      destination_id: kind === "type" ? null : destinationId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Tag;
}

export async function updateTag(
  id: string,
  updates: Partial<{ name: string; color: TypeHue; icon: string | null }>
): Promise<Tag> {
  const { data, error } = await supabase.from("tags").update(updates).eq("id", id).select().single();

  if (error) throw error;
  return data as Tag;
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw error;
}

export async function countTagUsage(tagId: string): Promise<number> {
  const { count, error } = await supabase
    .from("restaurant_tags")
    .select("restaurant_id", { count: "exact", head: true })
    .eq("tag_id", tagId);

  if (error) throw error;
  return count ?? 0;
}

async function nextPaletteColor(): Promise<TypeHue> {
  const { count } = await supabase
    .from("tags")
    .select("id", { count: "exact", head: true })
    .eq("kind", "type");
  return TYPE_HUES[(count ?? 0) % TYPE_HUES.length];
}

const FALLBACK_COLOR = "#5c6355";

// Tag pill background (300 light / 700 dark, via CSS var -- see app/globals.css).
export function tagColor(tag: Tag | null | undefined): string {
  return isTypeHue(tag?.color) ? tagColorVar(tag.color) : FALLBACK_COLOR;
}

// Map pin fill (500, same in light/dark).
export function tagMapColor(tag: Tag | null | undefined): string {
  return isTypeHue(tag?.color) ? mapColorVar(tag.color) : FALLBACK_COLOR;
}

// Curated set of Phosphor icon names offered when creating a new tag (see
// TagPicker) -- kept as a fixed whitelist rather than free text so every tag
// icon is guaranteed to resolve to a real, food-appropriate glyph.
export const TAG_ICONS = [
  "ForkKnife",
  "Coffee",
  "Bread",
  "IceCream",
  "BowlFood",
  "Hamburger",
  "Pizza",
  "CookingPot",
  "Wine",
  "Cookie",
  "Fish",
  "BeerStein",
  "Cake",
  "ChefHat",
  "Cheese",
  "Carrot",
  "Avocado",
  "Martini",
  "Popcorn",
  "BowlSteam",
] as const;

export type TagIconName = (typeof TAG_ICONS)[number];

const DEFAULT_TAG_ICON: TagIconName = "ForkKnife";

export function tagIcon(tag: Tag | null | undefined): TagIconName {
  if (tag?.icon && (TAG_ICONS as readonly string[]).includes(tag.icon)) {
    return tag.icon as TagIconName;
  }
  return DEFAULT_TAG_ICON;
}

// Best-effort mapping from Google Places' `primaryType` to a tag *name* -- this only
// prefills the tag picker's search box (see AddRestaurantFlow/TagPicker), it never
// selects or creates a tag on its own. Matches against existing tags by name; if
// nothing matches, the user creates a new one or ignores the suggestion entirely.
const PLACE_TYPE_TO_TAG_NAME: Record<string, string> = {
  bakery: "Bakery",
  cafe: "Cafe",
  coffee_shop: "Cafe",
  dessert_shop: "Dessert",
  ice_cream_shop: "Dessert",
  restaurant: "Restaurant",
  fine_dining_restaurant: "Restaurant",
};

export function suggestTagName(primaryType: string | null): string | null {
  if (!primaryType) return null;
  return PLACE_TYPE_TO_TAG_NAME[primaryType] ?? null;
}
