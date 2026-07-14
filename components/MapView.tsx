"use client";

import { useEffect, useRef, useState } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { ArrowsHorizontal } from "@phosphor-icons/react";
import { PHOSPHOR_ICON_MAP, tagColor, tagIcon } from "@/lib/tags";
import { fetchRestaurants } from "@/lib/restaurants";
import { useRestaurantUI } from "./AppShell";
import { MapControlsDrawer } from "./MapControlsDrawer";
import { MapBottomCard } from "./MapBottomCard";
import type { Restaurant } from "@/lib/types";

const FOCUS_ZOOM = 17;

// Imperatively pans/zooms once both the map instance and the target restaurant are
// ready -- can't just use a smarter defaultCenter/defaultZoom, since the restaurant
// list (and therefore which one matches focusPlaceId) loads asynchronously after the
// Map has already mounted at its default view.
function FocusOnPlace({ restaurant }: { restaurant: Restaurant | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !restaurant) return;
    map.panTo({ lat: restaurant.lat, lng: restaurant.lng });
    map.setZoom(FOCUS_ZOOM);
  }, [map, restaurant]);
  return null;
}

function RestaurantMarker({
  restaurant,
  onSelect,
}: {
  restaurant: Restaurant;
  onSelect: (restaurant: Restaurant) => void;
}) {
  const map = useMap();
  const Icon = PHOSPHOR_ICON_MAP[tagIcon(restaurant.primaryTag)];
  return (
    <AdvancedMarker
      position={{ lat: restaurant.lat, lng: restaurant.lng }}
      onClick={() => {
        map?.panTo({ lat: restaurant.lat, lng: restaurant.lng });
        onSelect(restaurant);
      }}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow"
        style={{ background: tagColor(restaurant.primaryTag) }}
      >
        <Icon size={16} weight="bold" color="#ffffff" />
      </div>
    </AdvancedMarker>
  );
}

// Stays anchored over the map itself (not the drawer) so its position doesn't drift
// when the drawer occupies the space beside it on desktop.
function MapExpandButton({
  open,
  onToggle,
  centerRef,
}: {
  open: boolean;
  onToggle: () => void;
  centerRef: React.MutableRefObject<google.maps.LatLng | null>;
}) {
  const map = useMap();
  return (
    <button
      onClick={() => {
        centerRef.current = map?.getCenter() ?? null;
        onToggle();
      }}
      aria-label={open ? "Close map controls" : "Open map controls"}
      className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-black/70 shadow backdrop-blur dark:bg-black/80 dark:text-white/70"
    >
      <ArrowsHorizontal size={18} weight="bold" />
    </button>
  );
}

export function MapView({
  query,
  focusPlaceId,
}: {
  query: string;
  focusPlaceId?: string | null;
}) {
  const { refreshToken } = useRestaurantUI();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const centerBeforeResize = useRef<google.maps.LatLng | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRestaurants()
      .then((data) => {
        setRestaurants(data);
        setLoadError(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      });
  }, [refreshToken, retryToken]);

  const focusedRestaurant = focusPlaceId
    ? (restaurants.find((r) => r.id === focusPlaceId) ?? null)
    : null;

  useEffect(() => {
    if (focusedRestaurant) setSelectedId(focusedRestaurant.id);
  }, [focusedRestaurant]);
  const selectedRestaurant = selectedId
    ? (restaurants.find((r) => r.id === selectedId) ?? null)
    : null;

  const q = query.trim().toLowerCase();
  const filtered = restaurants.filter((r) => {
    if (!q) return true;
    const tagNames = [...r.tags, ...r.areas, ...(r.city ? [r.city] : [])].map((t) =>
      t.name.toLowerCase()
    );
    return (
      r.name.toLowerCase().includes(q) ||
      r.address.toLowerCase().includes(q) ||
      tagNames.some((n) => n.includes(q))
    );
  });

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-black/50 dark:text-white/50">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local to render the map.
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative flex flex-1 flex-col md:flex-row">
        <div className="relative min-h-0 min-w-0 flex-1 md:order-2">
          {loadError && (
            <div className="absolute inset-x-0 top-4 z-10 mx-auto flex w-fit items-center gap-3 rounded-full bg-white/95 px-4 py-2 text-sm text-black/70 shadow dark:bg-black/85 dark:text-white/70">
              Couldn’t load places.
              <button
                onClick={() => setRetryToken((n) => n + 1)}
                className="font-medium underline"
              >
                Retry
              </button>
            </div>
          )}
          <Map
            className="h-full w-full"
            defaultCenter={{ lat: -33.8688, lng: 151.2093 }}
            defaultZoom={12}
            mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "7a03f40461f9aed667a8cf4f"}
            gestureHandling="greedy"
            mapTypeControl={false}
            onClick={() => setSelectedId(null)}
          >
            <FocusOnPlace restaurant={focusedRestaurant} />
            {filtered.map((r) => (
              <RestaurantMarker
                key={r.id}
                restaurant={r}
                onSelect={(restaurant) => setSelectedId(restaurant.id)}
              />
            ))}
          </Map>
          <MapExpandButton
            open={drawerOpen}
            onToggle={() => setDrawerOpen((o) => !o)}
            centerRef={centerBeforeResize}
          />
          <MapBottomCard restaurant={selectedRestaurant} onClose={() => setSelectedId(null)} />
        </div>
        <MapControlsDrawer open={drawerOpen} centerRef={centerBeforeResize} />
      </div>
    </APIProvider>
  );
}
