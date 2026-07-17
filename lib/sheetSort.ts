import type { Restaurant } from "./types";

export type SheetColumn =
  | "fav"
  | "name"
  | "type"
  | "tags"
  | "area"
  | "address"
  | "lat"
  | "lng"
  | "phone"
  | "website"
  | "price"
  | "notes"
  | "added"
  | "updated";

export type SortDirection = "asc" | "desc";

const SHEET_COLUMNS: readonly SheetColumn[] = [
  "fav",
  "name",
  "type",
  "tags",
  "area",
  "address",
  "lat",
  "lng",
  "phone",
  "website",
  "price",
  "notes",
  "added",
  "updated",
];

export function isSheetColumn(value: string | null): value is SheetColumn {
  return (SHEET_COLUMNS as readonly string[]).includes(value ?? "");
}

// Empty/null values always sort last regardless of direction -- an unset field isn't
// meaningfully "less than" a set one, so flipping direction shouldn't move it to the top.
function compareNullableString(a: string | null, b: string | null, dir: SortDirection): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b) * (dir === "asc" ? 1 : -1);
}

function comparePriceLevel(a: number | null, b: number | null, dir: SortDirection): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return (a - b) * (dir === "asc" ? 1 : -1);
}

function compareTimestamp(a: string, b: string, dir: SortDirection): number {
  return (new Date(a).getTime() - new Date(b).getTime()) * (dir === "asc" ? 1 : -1);
}

function compareNullableNumber(a: number | null, b: number | null, dir: SortDirection): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return (a - b) * (dir === "asc" ? 1 : -1);
}

export function formatPriceLevel(level: number | null): string {
  return level ? "$".repeat(level) : "";
}

// Accepts "$".."$$$$" or a plain "1".."4"; anything else (including empty) is "not set".
// Shared between manual cell edits and pasted values so both parse identically.
export function parsePriceLevel(raw: string): number | null {
  const value = raw.trim();
  if (/^\${1,4}$/.test(value)) return value.length;
  const num = Number(value);
  if (Number.isInteger(num) && num >= 1 && num <= 4) return num;
  return null;
}

// Shared by the Lat/Lng cells -- empty or non-numeric input clears the coordinate
// rather than erroring, same "not set" fallback as parsePriceLevel.
export function parseNullableFloat(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

// Type/Tags/Area sort by the exact same joined string shown in the cell -- "what you
// see is what it sorts by", rather than a different ordering the user can't see
// reflected.
export function compareRestaurants(
  a: Restaurant,
  b: Restaurant,
  column: SheetColumn,
  dir: SortDirection
): number {
  const mul = dir === "asc" ? 1 : -1;
  switch (column) {
    case "fav":
      return (Number(a.is_favourite) - Number(b.is_favourite)) * mul;
    case "name":
      return a.name.localeCompare(b.name) * mul;
    case "type":
      return compareNullableString(
        a.types.map((t) => t.name).join(", ") || null,
        b.types.map((t) => t.name).join(", ") || null,
        dir
      );
    case "tags":
      return compareNullableString(
        a.tags.map((t) => t.name).join(", ") || null,
        b.tags.map((t) => t.name).join(", ") || null,
        dir
      );
    case "area":
      return compareNullableString(
        a.areas.map((ar) => ar.name).join(", ") || null,
        b.areas.map((ar) => ar.name).join(", ") || null,
        dir
      );
    case "address":
      return compareNullableString(a.address, b.address, dir);
    case "lat":
      return compareNullableNumber(a.lat, b.lat, dir);
    case "lng":
      return compareNullableNumber(a.lng, b.lng, dir);
    case "phone":
      return compareNullableString(a.phone, b.phone, dir);
    case "website":
      return compareNullableString(a.website, b.website, dir);
    case "price":
      return comparePriceLevel(a.price_level, b.price_level, dir);
    case "notes":
      return compareNullableString(a.notes, b.notes, dir);
    case "added":
      return compareTimestamp(a.created_at, b.created_at, dir);
    case "updated":
      return compareTimestamp(a.updated_at, b.updated_at, dir);
    default:
      return 0;
  }
}
