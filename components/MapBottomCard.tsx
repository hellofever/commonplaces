"use client";

import { useEffect, useState, type RefObject } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { X } from "@phosphor-icons/react";
import { RestaurantCardContent } from "./RestaurantCardContent";
import { animateFocusOnRestaurant } from "./MapView";
import type { Restaurant } from "@/lib/types";

// Experimental alternative to the drawer's restaurant panel -- floats over the map
// itself instead of living in the sidebar, so both can be compared side by side.
// Dismissal on outside click is handled by the map's own onClick (see MapView) rather
// than a document-wide listener here, so clicking other UI (e.g. the drawer expander)
// doesn't clear the selection -- only clicking the map surface itself does.
//
// "floating" (desktop) is self-positioned and centered, same as the original design.
// "sheet" (mobile) is a plain flow element instead -- MapView lays it out as the last
// child of a bottom-anchored flex column shared with the locate button, so the card
// sliding in pushes the button up above it via ordinary reflow rather than manual
// height math.
export function MapBottomCard({
  restaurant,
  onClose,
  variant = "floating",
  overlayRef,
}: {
  restaurant: Restaurant | null;
  onClose: () => void;
  variant?: "floating" | "sheet";
  // MapView's own ref for whichever variant is actually rendered -- lets both
  // PanToSelectedRestaurant and this card's own "Locate on map" button measure the
  // real, rendered overlay footprint (see animateFocusOnRestaurant in MapView) instead
  // of guessing a height.
  overlayRef?: RefObject<HTMLDivElement | null>;
}) {
  const map = useMap();
  const [locateActive, setLocateActive] = useState(false);

  // A fresh selection is already centered by the time this card shows it -- a marker
  // click or a `?place=` deep link (both handled by MapView's PanToSelectedRestaurant)
  // pan there first -- so the toggle starts on and only a manual pan away turns it back
  // off. Adjusted during render (react.dev's documented alternative to an effect for
  // this exact case, same pattern app/page.tsx uses for its own prevView tracking)
  // rather than a useEffect, since this only ever needs to run when the selected
  // restaurant actually changes.
  const [prevRestaurantId, setPrevRestaurantId] = useState(restaurant?.id ?? null);
  if ((restaurant?.id ?? null) !== prevRestaurantId) {
    setPrevRestaurantId(restaurant?.id ?? null);
    setLocateActive(restaurant?.lat != null && restaurant?.lng != null);
  }

  // Mirrors LocateMeButton/DeactivateLocateOnDrag in MapView: the red "located" state
  // only means something while the map is still centered where the button put it, so
  // a manual pan away (not this file's own animateCameraTo, which never fires
  // "dragstart") turns it back off.
  useEffect(() => {
    if (!map || !locateActive) return;
    const listener = map.addListener("dragstart", () => setLocateActive(false));
    return () => listener.remove();
  }, [map, locateActive]);

  if (!restaurant) return null;

  function handleLocate() {
    if (!map || !restaurant) return;
    animateFocusOnRestaurant(map, restaurant, overlayRef?.current ?? null);
    setLocateActive(true);
  }

  if (variant === "sheet") {
    return (
      <div
        ref={overlayRef}
        className="w-full animate-in slide-in-from-bottom-10 fade-in duration-200"
      >
        <div className="rounded-t-2xl bg-white p-4 shadow-xl dark:bg-zinc-900">
          <RestaurantCardContent
            restaurant={restaurant}
            onClose={onClose}
            onLocate={handleLocate}
            locateActive={locateActive}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={overlayRef}
      className="absolute inset-x-4 bottom-4 z-10 mx-auto w-auto max-w-[520px] rounded-xl bg-white p-8 shadow-xl dark:bg-zinc-900"
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 shrink-0 items-center justify-center text-black/50 dark:text-white/50"
        >
          <X size={20} weight="bold" />
        </button>
      )}
      <RestaurantCardContent
        restaurant={restaurant}
        onClose={onClose}
        onLocate={handleLocate}
        locateActive={locateActive}
        closeButtonPosition="corner"
      />
    </div>
  );
}
