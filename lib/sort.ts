import type { Restaurant } from "./types";

export type SortKey =
  | "name-asc"
  | "name-desc"
  | "created-desc"
  | "price-asc"
  | "price-desc"
  | "favourites-first"
  | "area";

export const DEFAULT_SORT: SortKey = "name-asc";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "created-desc", label: "Recently added" },
  { value: "price-asc", label: "Price (low to high)" },
  { value: "price-desc", label: "Price (high to low)" },
  { value: "favourites-first", label: "Favourites first" },
  { value: "area", label: "Area" },
];

export function isSortKey(value: string | null): value is SortKey {
  return SORT_OPTIONS.some((o) => o.value === value);
}

const NO_AREA_LABEL = "No area";

// Sorts a copy of the list -- never mutates the input. Restaurants with no price_level
// sort to the end regardless of direction, since there's nothing meaningful to compare.
// "area" doesn't reorder in place -- it's rendered as grouped sections instead (see
// groupByArea), this case just gives a sane flat fallback if sortRestaurants is ever
// called directly for it.
export function sortRestaurants(list: Restaurant[], sort: SortKey): Restaurant[] {
  const sorted = [...list];
  switch (sort) {
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "created-desc":
      return sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    case "price-asc":
      return sorted.sort((a, b) => (a.price_level ?? Infinity) - (b.price_level ?? Infinity));
    case "price-desc":
      return sorted.sort((a, b) => (b.price_level ?? -Infinity) - (a.price_level ?? -Infinity));
    case "favourites-first":
      return sorted.sort((a, b) => Number(b.is_favourite) - Number(a.is_favourite));
    case "area": {
      const areaName = (r: Restaurant) => r.areas[0]?.name ?? "￿";
      return sorted.sort(
        (a, b) => areaName(a).localeCompare(areaName(b)) || a.name.localeCompare(b.name)
      );
    }
    default:
      return sorted;
  }
}

export interface AreaGroup {
  areaName: string;
  restaurants: Restaurant[];
}

// Groups restaurants by area for the "Area" sort's sectioned view. A restaurant with
// multiple areas appears once per area it belongs to (duplicated across groups) rather
// than being filed under just one, so nothing it's tagged with is hidden. Restaurants
// with no area go in a trailing "No area" group. Groups are alphabetical; restaurants
// within a group are alphabetical by name.
export function groupByArea(list: Restaurant[]): AreaGroup[] {
  const groups = new Map<string, Restaurant[]>();

  for (const r of list) {
    const areaNames = r.areas.length > 0 ? r.areas.map((a) => a.name) : [NO_AREA_LABEL];
    for (const areaName of areaNames) {
      const bucket = groups.get(areaName);
      if (bucket) bucket.push(r);
      else groups.set(areaName, [r]);
    }
  }

  const areaNames = [...groups.keys()]
    .filter((name) => name !== NO_AREA_LABEL)
    .sort((a, b) => a.localeCompare(b));
  if (groups.has(NO_AREA_LABEL)) areaNames.push(NO_AREA_LABEL);

  return areaNames.map((areaName) => ({
    areaName,
    restaurants: [...groups.get(areaName)!].sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
