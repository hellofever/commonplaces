"use client";

import { useRouter, useSearchParams } from "next/navigation";

export type MapFilterKind = "types" | "tags" | "areas";

// Prefixed "map"-, distinct from List/Sheet's own ?types=/?tags=/?areas= -- all three
// views share one route/query-string (see app/page.tsx), and Map's filter selection is
// deliberately independent of List's/Sheet's.
const FILTER_PARAM_KEYS: Record<MapFilterKind, string> = {
  types: "mapTypes",
  tags: "mapTags",
  areas: "mapAreas",
};

// Shared by MapSearchExpand (search-bar filter panel) and MapControlsDrawer (the
// drawer's Type/Area sections) -- both read/write the same ?mapTypes=/?mapTags=/
// ?mapAreas= params, so the parsing and update logic lives here once instead of twice.
export function useMapFilterParams() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const typeIds = (searchParams.get("mapTypes") ?? "").split(",").filter(Boolean);
  const tagIds = (searchParams.get("mapTags") ?? "").split(",").filter(Boolean);
  const areaIds = (searchParams.get("mapAreas") ?? "").split(",").filter(Boolean);

  function updateIds(key: MapFilterKind, ids: string[]) {
    const paramKey = FILTER_PARAM_KEYS[key];
    const params = new URLSearchParams(searchParams.toString());
    if (ids.length > 0) params.set(paramKey, ids.join(","));
    else params.delete(paramKey);
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }

  return { typeIds, tagIds, areaIds, updateIds };
}
