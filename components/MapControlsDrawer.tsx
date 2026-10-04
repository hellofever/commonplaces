"use client";

import { useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { useMapFilterParams } from "@/lib/mapFilters";
import { useRestaurantUI } from "./AppShell";
import { BottomSheet, ModalHeader } from "./BottomSheet";
import { TagPills } from "./TagPills";

const sectionHeadingClass = "text-xs text-black/50 dark:text-white/50";

// Same BottomSheet every other panel in the app uses (nav menu, Settings, TagPicker) --
// same shadow/overlay, and the same "hug content height, cap at 85vh, scroll past that"
// sizing for free, instead of a hand-rolled fixed-height panel.
export function MapControlsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
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

  return (
    <BottomSheet open={open} onClose={onClose}>
      <ModalHeader title={<h2 className="text-lg">Map filters</h2>} onClose={onClose} className="mb-4" />

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
        <div className="mt-4 flex flex-col gap-1.5">
          <span className={sectionHeadingClass}>Type</span>
          <div className="flex flex-wrap gap-1.5">
            <TagPills kind="type" options={types} selectedIds={typeIds} onToggle={toggleType} />
          </div>
        </div>
      )}

      {areas.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          <span className={sectionHeadingClass}>Area</span>
          <div className="flex flex-wrap gap-1.5">
            <TagPills kind="area" options={areas} selectedIds={areaIds} onToggle={toggleArea} />
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-black/10 pt-3 dark:border-white/10">
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
    </BottomSheet>
  );
}
