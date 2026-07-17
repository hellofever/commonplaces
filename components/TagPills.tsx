"use client";

import { PHOSPHOR_ICON_MAP, tagColor, tagIcon, type Tag, type TagKind } from "@/lib/tags";

// Click-to-toggle pills that stay in a fixed position and switch between outlined
// (inactive) and filled (active) styling instead of moving to a separate "selected"
// row -- shared by the Filters dropdown (ListFilters) and the add/edit form's
// TagPicker so tag/area selection behaves and looks identical everywhere. Tags get
// their own assigned color plus the same icon used on the map pin (a little bigger to
// fit it, same pill shape otherwise); area pills are monochrome, icon-less, since they
// don't carry a real color (see lib/tags.ts, tagColor's null fallback).
export function TagPills({
  kind,
  options,
  selectedIds,
  onToggle,
}: {
  kind: TagKind;
  options: Tag[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <>
      {options.map((t) => {
        const active = selectedIds.includes(t.id);
        if (kind === "type") {
          const Icon = PHOSPHOR_ICON_MAP[tagIcon(t)];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onToggle(t.id)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
              style={
                active
                  ? { background: tagColor(t), borderColor: tagColor(t), color: "white" }
                  : { borderColor: tagColor(t), color: tagColor(t) }
              }
            >
              {Icon && <Icon size={14} weight={active ? "fill" : "bold"} />}
              {t.name}
            </button>
          );
        }
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onToggle(t.id)}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              active
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-black/15 text-black/70 dark:border-white/15 dark:text-white/70"
            }`}
          >
            {t.name}
          </button>
        );
      })}
    </>
  );
}
