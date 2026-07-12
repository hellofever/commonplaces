"use client";

import { useEffect, useState } from "react";
import { createTag, fetchTags, tagColor, type Tag, type TagKind } from "@/lib/tags";

// Shared multi/single-select for tags, area, and city -- all three are user-creatable,
// freeform lists stored the same way (see lib/tags.ts). Available options render as
// click-to-add pills (no typing required); selected ones render below as click-to-remove
// pills. `multiple` just controls whether picking a new option replaces the current
// selection or adds to it; nothing at the data layer enforces single-select for city,
// it's purely a UI choice.
export function TagPicker({
  kind,
  label,
  multiple,
  selectedIds,
  onChange,
  initialQuery,
}: {
  kind: TagKind;
  label: string;
  multiple: boolean;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  initialQuery?: string;
}) {
  const [options, setOptions] = useState<Tag[]>([]);
  const [showCreate, setShowCreate] = useState(!!initialQuery);
  const [createValue, setCreateValue] = useState(initialQuery ?? "");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTags(kind).then(setOptions).catch(console.error);
  }, [kind]);

  const selected = options.filter((o) => selectedIds.includes(o.id));
  const available = options.filter((o) => !selectedIds.includes(o.id));

  function toggle(id: string) {
    if (multiple) {
      onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    } else {
      onChange(selectedIds.includes(id) ? [] : [id]);
    }
  }

  async function handleCreate() {
    if (!createValue.trim()) return;
    setCreating(true);
    try {
      const tag = await createTag(kind, createValue.trim());
      setOptions((o) => [...o, tag]);
      onChange(multiple ? [...selectedIds, tag.id] : [tag.id]);
      setCreateValue("");
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span>{label}</span>

      <div className="flex flex-wrap gap-1.5">
        {available.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            className="rounded-full border px-2.5 py-1 text-xs"
            style={{ borderColor: tagColor(t), color: tagColor(t) }}
          >
            + {t.name}
          </button>
        ))}
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-full border border-dashed border-black/25 px-2.5 py-1 text-xs text-black/60 dark:border-white/25 dark:text-white/60"
          >
            + Add new {label.toLowerCase()}
          </button>
        )}
      </div>

      {showCreate && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={createValue}
            onChange={(e) => setCreateValue(e.target.value)}
            placeholder={`New ${label.toLowerCase()} name…`}
            className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !createValue.trim()}
            className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {creating ? "Adding…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreate(false);
              setCreateValue("");
            }}
            className="rounded-lg border border-black/10 px-3 py-2 text-xs dark:border-white/10"
          >
            Cancel
          </button>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-white"
              style={{ background: tagColor(t), borderColor: tagColor(t) }}
            >
              {t.name} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
