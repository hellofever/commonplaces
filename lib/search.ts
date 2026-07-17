import type { Restaurant } from "./types";

// Shared by List, Sheet, Map, and the Map search panel -- name/address/tag-name
// substring match, case-insensitive.
export function matchesQuery(r: Restaurant, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const tagNames = [...r.types, ...r.tags, ...r.areas].map((t) => t.name.toLowerCase());
  return (
    r.name.toLowerCase().includes(q) ||
    (r.address ?? "").toLowerCase().includes(q) ||
    tagNames.some((n) => n.includes(q))
  );
}
