"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Trash } from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlaceSearchPicker, type PlacePickResult } from "./PlaceSearchPicker";
import { useOptimisticSave } from "@/lib/useOptimisticSave";
import { useRestaurantUI } from "./AppShell";
import { deleteDestination, updateDestination, type Destination } from "@/lib/destinations";

const inputClass =
  "rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5";

export function DestinationSettings() {
  const { activeDestination } = useRestaurantUI();

  if (!activeDestination) {
    return <p className="text-sm text-black/50 dark:text-white/50">No destination selected.</p>;
  }

  // Remounted whenever the active destination changes, so local drafts (the Name
  // input) always start from that destination's own values -- same pattern as
  // DestinationSwitcher's Dropdown key. Takes `destination` as a prop (rather than
  // reading activeDestination again inside) so there's no window, right after a
  // delete, where the cache has already dropped it but the URL hasn't caught up yet --
  // this component only ever exists for a destination that's known to still be there.
  return <ActiveDestinationSettings key={activeDestination.id} destination={activeDestination} />;
}

function ActiveDestinationSettings({ destination }: { destination: Destination }) {
  const { destinations, restaurants, patchDestinationCache, removeDestinationFromCache } = useRestaurantUI();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { run, isPending, isError } = useOptimisticSave();

  const [name, setName] = useState(destination.name);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function commitName(next: string) {
    const trimmed = next.trim();
    if (!trimmed || trimmed === destination.name) {
      setName(destination.name);
      return;
    }
    const original = destination;
    run("name", {
      apply: () => patchDestinationCache({ ...destination, name: trimmed }),
      revert: () => {
        patchDestinationCache(original);
        setName(original.name);
      },
      write: () => updateDestination(destination.id, { name: trimmed }),
    });
  }

  function handleLocationPick(result: PlacePickResult) {
    if (result.lat == null || result.lng == null) {
      setError("Couldn't resolve a location for that place — try a different result.");
      return;
    }
    const lat = result.lat;
    const lng = result.lng;
    setError(null);
    const original = destination;
    run("location", {
      apply: () => {
        patchDestinationCache({ ...destination, google_place_id: result.placeId, lat, lng });
        setPickingLocation(false);
      },
      revert: () => {
        patchDestinationCache(original);
        setPickingLocation(true);
      },
      write: async () => {
        try {
          return await updateDestination(destination.id, { google_place_id: result.placeId, lat, lng });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
          throw err;
        }
      },
    });
  }

  const restaurantCount = restaurants.length;
  const isOnlyDestination = destinations.length <= 1;

  function handleDeleteConfirmed() {
    setError(null);
    run("delete", {
      apply: () => {},
      revert: () => {},
      write: async () => {
        try {
          await deleteDestination(destination.id);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
          throw err;
        }
      },
      onSuccess: () => {
        removeDestinationFromCache(destination.id);
        const remaining = destinations.filter((d) => d.id !== destination.id);
        const params = new URLSearchParams(searchParams.toString());
        if (remaining[0]) params.set("destination", remaining[0].id);
        else params.delete("destination");
        router.replace(`${pathname}?${params.toString()}`);
        setConfirmingDelete(false);
      },
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-xs text-black/50 dark:text-white/50">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => commitName(name)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              setName(destination.name);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={`w-full max-w-xs ${inputClass} ${
            isError("name") ? "border-red-500 ring-2 ring-red-500" : ""
          }`}
        />
        {isError("name") && (
          <p className="text-sm text-red-600 dark:text-red-400">Something went wrong. Try again.</p>
        )}
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-black/50 dark:text-white/50">Location</span>
        <div>
          <p className="text-sm text-black/70 dark:text-white/70">{destination.name}</p>
          {destination.lat != null && destination.lng != null && (
            <p className="text-xs text-black/40 dark:text-white/40">
              {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
            </p>
          )}
        </div>

        {!pickingLocation && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setPickingLocation(true);
            }}
            className="w-fit rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-black/70 dark:border-white/15 dark:text-white/70"
          >
            Change location
          </button>
        )}
        {pickingLocation && (
          <div className="flex flex-col gap-2">
            <PlaceSearchPicker
              placeholder="City or country, e.g. Mexico City, Mexico"
              onPick={handleLocationPick}
            />
            {isPending("location") && (
              <p className="text-sm text-black/50 dark:text-white/50">Saving…</p>
            )}
            <button
              type="button"
              onClick={() => setPickingLocation(false)}
              className="w-fit text-sm text-black/60 underline dark:text-white/60"
            >
              Cancel
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-black/10 pt-4 dark:border-white/10">
        <span className="text-xs text-black/50 dark:text-white/50">Danger zone</span>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="flex w-fit items-center gap-1.5 rounded-full border border-red-600/20 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-600/5 dark:border-red-400/30 dark:text-red-400"
        >
          <Trash size={14} weight="bold" />
          Delete destination
        </button>
      </div>

      <AlertDialog open={confirmingDelete} onOpenChange={(o) => !o && setConfirmingDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {destination.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {isOnlyDestination
                ? "This is your only destination — you need at least one."
                : restaurantCount > 0
                  ? `This destination has ${restaurantCount} restaurant${restaurantCount === 1 ? "" : "s"} — delete or move them first.`
                  : "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isError("delete") && error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirmed}
              disabled={isPending("delete") || isOnlyDestination || restaurantCount > 0}
            >
              {isPending("delete") ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
