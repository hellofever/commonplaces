"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check } from "@phosphor-icons/react";
import { BottomSheet, ModalHeader } from "./BottomSheet";
import { PlaceSearchPicker, type PlacePickResult } from "./PlaceSearchPicker";
import { useRestaurantUI } from "./AppShell";
import { createDestination, type Destination } from "@/lib/destinations";

// Modal content only -- no trigger, no open/close state of its own (same shape as
// Settings). Header owns the open state and renders this inside a top-level
// BottomSheet for both the desktop icon trigger and the mobile menu's row trigger.
// Picking a destination scopes the whole app to it (?destination=, see AppShell) and
// always lands you back on Map, even if you re-pick the one that's already active --
// one consistent "tap a destination, see it on the map" action regardless of where you
// started from.
export function DestinationPicker({ onSelect }: { onSelect?: () => void }) {
  const { destinations, activeDestinationId, patchDestinationCache, beginDestinationSwitch } = useRestaurantUI();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [creating, setCreating] = useState(false);

  function goTo(id: string) {
    // Only when it's an actual change -- picking the already-active destination
    // doesn't re-trigger AppShell's fetch effect, so the overlay would never clear.
    if (id !== activeDestinationId) beginDestinationSwitch();
    const params = new URLSearchParams(searchParams.toString());
    params.set("destination", id);
    params.delete("view");
    router.replace(`${pathname}?${params.toString()}`);
    onSelect?.();
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        {destinations.map((d) => {
          const isActive = d.id === activeDestinationId;
          return (
            <button
              key={d.id}
              onClick={() => goTo(d.id)}
              className={`flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-sm ${
                isActive
                  ? "bg-black/[.04] font-medium text-red-500 dark:bg-white/[.08]"
                  : "hover:bg-black/[.03] dark:hover:bg-white/[.05]"
              }`}
            >
              {d.name}
              {isActive && <Check size={14} weight="bold" className="text-red-500" />}
            </button>
          );
        })}
        <div className="mt-1 border-t border-black/10 pt-1 dark:border-white/10">
          <button
            onClick={() => setCreating(true)}
            className="w-full rounded-md px-3 py-2.5 text-left text-sm text-black/60 hover:bg-black/[.03] dark:text-white/60 dark:hover:bg-white/[.05]"
          >
            + New Destination
          </button>
        </div>
      </div>

      <BottomSheet open={creating} onClose={() => setCreating(false)}>
        <NewDestinationForm
          onCreated={(d) => {
            patchDestinationCache(d);
            setCreating(false);
            goTo(d.id);
          }}
          onCancel={() => setCreating(false)}
        />
      </BottomSheet>
    </>
  );
}

function NewDestinationForm({
  onCreated,
  onCancel,
}: {
  onCreated: (destination: Destination) => void;
  onCancel: () => void;
}) {
  const { destinations } = useRestaurantUI();
  const [picked, setPicked] = useState<PlacePickResult | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(result: PlacePickResult) {
    setPicked(result);
    setName(result.name);
    setError(null);
  }

  async function handleCreate() {
    if (!picked) return;
    if (picked.lat == null || picked.lng == null) {
      setError("Couldn't resolve a location for that place — try a different result.");
      return;
    }
    const existing = destinations.find((d) => d.google_place_id === picked.placeId);
    if (existing) {
      onCreated(existing);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createDestination({
        name: name.trim() || picked.name,
        googlePlaceId: picked.placeId,
        lat: picked.lat,
        lng: picked.lng,
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5";

  if (picked) {
    return (
      <div className="flex flex-col gap-3">
        <ModalHeader title={<h2 className="text-lg">New destination</h2>} onClose={onCancel} />
        <p className="text-sm text-black/60 dark:text-white/60">{picked.address}</p>
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={saving || !name.trim()}
          className="rounded-lg bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {saving ? "Creating…" : "Create destination"}
        </button>
        <button
          onClick={() => setPicked(null)}
          className="w-fit text-sm text-black/60 underline dark:text-white/60"
        >
          Back to results
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ModalHeader title={<h2 className="text-lg">New destination</h2>} onClose={onCancel} />
      <PlaceSearchPicker placeholder="City or country, e.g. Mexico City, Mexico" onPick={pick} />
      <button onClick={onCancel} className="w-fit text-sm text-black/60 underline dark:text-white/60">
        Cancel
      </button>
    </div>
  );
}
