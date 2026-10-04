"use client";

import { useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { useMapFilterParams } from "@/lib/mapFilters";
import { useRestaurantUI } from "./AppShell";
import { TagPills } from "./TagPills";

const sectionHeadingClass = "text-xs text-black/50 dark:text-white/50";

export function MapControlsDrawer({
  open,
  centerRef,
}: {
  open: boolean;
  centerRef: React.MutableRefObject<google.maps.LatLng | null>;
}) {
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const map = useMap();
  const { types, areas } = useRestaurantUI();
  const { typeIds, areaIds, updateIds } = useMapFilterParams();

  function selectMapType(type: "roadmap" | "satellite") {
    setMapType(type);
    map?.setMapTypeId(type);
  }

  function toggleType(id: string) {
    updateIds("types", typeIds.includes(id) ? typeIds.filter((x) => x !== id) : [...typeIds, id]);
  }

  function toggleArea(id: string) {
    updateIds("areas", areaIds.includes(id) ? areaIds.filter((x) => x !== id) : [...areaIds, id]);
  }

  function resetFilters() {
    updateIds("types", []);
    updateIds("areas", []);
  }

  const hasActiveFilters = typeIds.length > 0 || areaIds.length > 0;

  // The drawer resizes the map's flex sibling via a plain CSS transition (width on
  // desktop, height on mobile) -- @vis.gl/react-google-maps doesn't watch its container
  // for size changes, so the underlying Google Map only redraws at the new size once we
  // trigger a resize event ourselves, once the transition finishes.
  function handleTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (!map) return;
    google.maps.event.trigger(map, "resize");
    if (centerRef.current) map.setCenter(centerRef.current);
  }

  return (
    <div
      onTransitionEnd={handleTransitionEnd}
      className={`shrink-0 overflow-hidden bg-white shadow-xl transition-[width,height] duration-300 ease-in-out
        md:order-1 md:h-auto
        dark:bg-zinc-900 ${open ? "h-96 md:w-72" : "h-0 md:w-0"}`}
    >
      <div className="flex h-96 w-full flex-col gap-4 overflow-y-auto p-4 md:h-full md:w-72">
        <div className="flex flex-col gap-1.5">
          <span className={sectionHeadingClass}>View</span>
          <div className="flex gap-2">
            {(["roadmap", "satellite"] as const).map((type) => (
              <button
                key={type}
                onClick={() => selectMapType(type)}
                className={`rounded-full px-3 py-1.5 text-sm capitalize transition-colors ${
                  mapType === type
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "border border-black/10 text-black/60 dark:border-white/10 dark:text-white/60"
                }`}
              >
                {type === "roadmap" ? "Map" : "Satellite"}
              </button>
            ))}
          </div>
        </div>

        {types.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className={sectionHeadingClass}>Type</span>
            <div className="flex flex-wrap gap-1.5">
              <TagPills kind="type" options={types} selectedIds={typeIds} onToggle={toggleType} />
            </div>
          </div>
        )}

        {areas.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className={sectionHeadingClass}>Area</span>
            <div className="flex flex-wrap gap-1.5">
              <TagPills kind="area" options={areas} selectedIds={areaIds} onToggle={toggleArea} />
            </div>
          </div>
        )}

        <div className="mt-auto border-t border-black/10 pt-3 dark:border-white/10">
          <button
            type="button"
            disabled={!hasActiveFilters}
            onClick={resetFilters}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-black/15 px-2.5 py-1.5 text-xs font-medium text-black/70 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-white/70"
          >
            <ArrowCounterClockwise size={14} weight="bold" />
            Reset filters
          </button>
        </div>
      </div>
    </div>
  );
}
