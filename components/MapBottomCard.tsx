"use client";

import { RestaurantCardContent } from "./RestaurantCardContent";
import type { Restaurant } from "@/lib/types";

// Experimental alternative to the drawer's restaurant panel -- floats over the map
// itself instead of living in the sidebar, so both can be compared side by side.
// Dismissal on outside click is handled by the map's own onClick (see MapView) rather
// than a document-wide listener here, so clicking other UI (e.g. the drawer expander)
// doesn't clear the selection -- only clicking the map surface itself does.
export function MapBottomCard({
  restaurant,
  onClose,
}: {
  restaurant: Restaurant | null;
  onClose: () => void;
}) {
  if (!restaurant) return null;

  return (
    <div className="absolute inset-x-4 bottom-4 z-10 mx-auto w-auto max-w-sm rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900">
      <RestaurantCardContent restaurant={restaurant} onClose={onClose} />
    </div>
  );
}
