import type { Tag } from "./tags";
import type { Restaurant } from "./types";

export type SortKey =
  | "name-asc"
  | "name-desc"
  | "created-desc"
  | "updated-desc"
  | "price-asc"
  | "price-desc"
  | "favourites-first";

export const DEFAULT_SORT: SortKey = "name-asc";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "created-desc", label: "Recently added" },
  { value: "updated-desc", label: "Recently edited" },
  { value: "price-asc", label: "Price (low to high)" },
  { value: "price-desc", label: "Price (high to low)" },
  { value: "favourites-first", label: "Favourites first" },
];

export function isSortKey(value: string | null): value is SortKey {
  return SORT_OPTIONS.some((o) => o.value === value);
}

// Sorts a copy of the list -- never mutates the input. Restaurants with no price_level
// sort to the end regardless of direction, since there's nothing meaningful to compare.
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
    case "updated-desc":
      return sorted.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    case "price-asc":
      return sorted.sort((a, b) => (a.price_level ?? Infinity) - (b.price_level ?? Infinity));
    case "price-desc":
      return sorted.sort((a, b) => (b.price_level ?? -Infinity) - (a.price_level ?? -Infinity));
    case "favourites-first":
      return sorted.sort((a, b) => Number(b.is_favourite) - Number(a.is_favourite));
    default:
      return sorted;
  }
}

export type GroupByKey = "none" | "types" | "tags" | "areas";

export const DEFAULT_GROUP_BY: GroupByKey = "none";

export const GROUP_BY_OPTIONS: { value: GroupByKey; label: string }[] = [
  { value: "none", label: "None" },
  { value: "types", label: "Type" },
  { value: "tags", label: "Tags" },
  { value: "areas", label: "Area" },
];

export function isGroupByKey(value: string | null): value is GroupByKey {
  return GROUP_BY_OPTIONS.some((o) => o.value === value);
}

export interface FacetGroup {
  groupName: string;
  // The Tag row backing this group (null for the trailing "No ..." group) -- lets the
  // List view show a group's colour/icon next to its heading (only "type" tags carry
  // those, see lib/tags.ts createTag) without a second lookup by name.
  tag: Tag | null;
  restaurants: Restaurant[];
}

type FacetKey = Exclude<GroupByKey, "none">;

const NO_GROUP_LABEL: Record<FacetKey, string> = {
  types: "No type",
  tags: "No tags",
  areas: "No area",
};

// Groups restaurants by one of their tag-style facets (type/tags/area) for the List
// view's "Group by" toolbar toggle. A restaurant with multiple values for that facet
// appears once per value (duplicated across groups) rather than being filed under just
// one, so nothing it's tagged with is hidden. Restaurants with no value for the facet go
// in a trailing "No ..." group. Groups are alphabetical; restaurants within a group keep
// whatever order the current Sort produces, so Group by and Sort compose independently.
export function groupByFacet(list: Restaurant[], facet: FacetKey, sort: SortKey): FacetGroup[] {
  const noGroupLabel = NO_GROUP_LABEL[facet];
  const groups = new Map<string, Restaurant[]>();
  const tagByName = new Map<string, Tag>();

  for (const r of list) {
    const values = r[facet];
    const names = values.length > 0 ? values.map((t) => t.name) : [noGroupLabel];
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      if (values.length > 0 && !tagByName.has(name)) tagByName.set(name, values[i]);
      const bucket = groups.get(name);
      if (bucket) bucket.push(r);
      else groups.set(name, [r]);
    }
  }

  const groupNames = [...groups.keys()]
    .filter((name) => name !== noGroupLabel)
    .sort((a, b) => a.localeCompare(b));
  if (groups.has(noGroupLabel)) groupNames.push(noGroupLabel);

  return groupNames.map((groupName) => ({
    groupName,
    tag: tagByName.get(groupName) ?? null,
    restaurants: sortRestaurants(groups.get(groupName)!, sort),
  }));
}
