"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { CircleNotch } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { fetchRestaurants } from "@/lib/restaurants";
import { fetchTags, type Tag, type TagKind } from "@/lib/tags";
import { fetchDestinations, type Destination } from "@/lib/destinations";
import { getLastDestinationId, setLastDestinationId } from "@/lib/preferences";
import type { Restaurant } from "@/lib/types";
import { Header } from "./Header";
import { BottomSheet } from "./BottomSheet";
import { RestaurantDetailView } from "./RestaurantDetailView";
import { AddRestaurantFlow } from "./AddRestaurantFlow";
import { LoginForm } from "./LoginForm";

type SheetState =
  | { kind: "detail"; restaurant: Restaurant }
  | { kind: "add" }
  | { kind: "edit"; restaurant: Restaurant }
  | { kind: "add-inline"; initialQuery: string; onSaved: (restaurant: Restaurant) => void }
  | null;

interface RestaurantUIContextValue {
  openDetail: (restaurant: Restaurant) => void;
  openEdit: (restaurant: Restaurant) => void;
  openAdd: () => void;
  // Used by the Sheet view's empty-row "+" button: runs the normal search/manual Add
  // flow, but the caller decides what happens on save instead of always opening the
  // detail view -- the Sheet just drops the new row into place, no modal popup.
  openAddInline: (initialQuery: string, onSaved: (restaurant: Restaurant) => void) => void;

  // Cached data, loaded once at login and kept in sync via cache patches + Realtime
  // invalidation (see AuthenticatedShell below) rather than refetched by each consumer.
  restaurants: Restaurant[];
  types: Tag[];
  tags: Tag[];
  areas: Tag[];
  restaurantsError: boolean;
  tagsError: boolean;
  lastSyncedAt: Date | null;

  // Destinations scope the whole app -- restaurants are fetched filtered to
  // activeDestinationId (see fetchRestaurants), not client-side. activeDestinationId
  // is real state set directly by switchDestination (see below), with the ?destination=
  // URL param kept in sync as a best-effort side effect for shareability/reload-safety
  // -- it's not the source of truth, since Next's router.replace has been observed to
  // silently no-op on some iOS Safari sessions.
  destinations: Destination[];
  activeDestinationId: string | null;
  activeDestination: Destination | null;
  destinationsError: boolean;
  // True from the moment switchDestination commits to a different id until that
  // destination's restaurants/tags finish loading (see the effect below) -- drives the
  // full-screen loading overlay so a switch never shows a flash of the previous
  // destination's pins/empty state while the new one's fetch is in flight.
  destinationSwitching: boolean;
  switchDestination: (id: string | null) => void;

  // Force a full refetch of a domain -- used by Settings' "Sync now" button and by
  // Realtime event handlers. Falls back to serving stale cached data on failure.
  syncNow: () => Promise<void>;
  syncRestaurants: () => Promise<void>;
  syncTags: () => Promise<void>;
  syncDestinations: () => Promise<void>;

  // Patch the cache directly from a mutation's own return value/known new state --
  // the default path after a create/update/delete, so most mutations don't need a
  // round trip back to Supabase just to see their own effect reflected everywhere.
  patchRestaurantCache: (restaurant: Restaurant) => void;
  removeRestaurantsCache: (ids: string[]) => void;
  // A fresh object reference every time patchRestaurantCache runs (add, edit, or a
  // favourite toggle) -- lets a view with its own derived per-restaurant cache (e.g.
  // List Card display's photo thumbnails, which aren't part of the Restaurant type)
  // refresh just that one restaurant instead of waiting on the next full reload. Plain
  // `restaurants` array identity isn't enough for this: patching an already-cached
  // restaurant (an edit, not an add) produces a new array but the same id set, so a
  // consumer keyed on ids alone would never notice the patch.
  lastPatchedRestaurant: Restaurant | null;
  patchTagCache: (tag: Tag) => void;
  removeTagFromCache: (kind: TagKind, id: string) => void;
  patchDestinationCache: (destination: Destination) => void;
  removeDestinationFromCache: (id: string) => void;
}

const RestaurantUIContext = createContext<RestaurantUIContextValue | null>(null);

export function useRestaurantUI() {
  const ctx = useContext(RestaurantUIContext);
  if (!ctx) throw new Error("useRestaurantUI must be used within AppShell");
  return ctx;
}

function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-black/50 dark:text-white/50">
      Loading…
    </div>
  );
}

// z-[60]: above every BottomSheet (z-50, see BottomSheet.tsx) so it covers a
// still-closing sheet's transition instead of racing it.
function DestinationSwitchOverlay() {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/60 dark:bg-black/60">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg dark:bg-zinc-900">
        <CircleNotch size={28} weight="bold" className="animate-spin text-black/50 dark:text-white/50" />
      </div>
    </div>
  );
}

function upsertByIdSortedByName<T extends { id: string; name: string }>(list: T[], item: T): T[] {
  const next = list.filter((x) => x.id !== item.id);
  next.push(item);
  next.sort((a, b) => a.name.localeCompare(b.name));
  return next;
}

// Destinations sort oldest-first (not alphabetically) so the original/default
// destination stays first -- see activeDestinationId's fallback below.
function upsertByIdSortedByCreatedAt<T extends { id: string; created_at: string }>(
  list: T[],
  item: T
): T[] {
  const next = list.filter((x) => x.id !== item.id);
  next.push(item);
  next.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return next;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Loading />;
  if (!session) return <LoginForm />;

  // Keyed by session.user.id so a different user signing in on the same browser
  // (shared device) always mounts a fresh AuthenticatedShell instance instead of
  // reusing one whose cache belongs to the previous account.
  return <AuthenticatedShell key={session.user.id}>{children}</AuthenticatedShell>;
}

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<SheetState>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [lastPatchedRestaurant, setLastPatchedRestaurant] = useState<Restaurant | null>(null);
  const [types, setTypes] = useState<Tag[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [areas, setAreas] = useState<Tag[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [restaurantsError, setRestaurantsError] = useState(false);
  const [tagsError, setTagsError] = useState(false);
  const [destinationsError, setDestinationsError] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  // Two-stage bootstrap: destinations+types load first (no destination dependency --
  // type is one taxonomy shared by every destination), then restaurants and the active
  // destination's own tags/area load once activeDestinationId is resolved -- see the
  // effects below. initialLoadDone only flips once both stages have completed once.
  const [destinationsAndTypesLoaded, setDestinationsAndTypesLoaded] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [destinationSwitching, setDestinationSwitching] = useState(false);

  const destinationParam = searchParams.get("destination");
  // Falls back to the last destination this device was on (see the persist effect
  // below), not always the oldest one -- but only if that id still refers to a
  // destination that actually exists (it may have been deleted since, or this may be
  // the first-ever load with nothing saved yet).
  const lastDestinationId = getLastDestinationId();
  const fallbackDestinationId =
    (lastDestinationId && destinations.some((d) => d.id === lastDestinationId)
      ? lastDestinationId
      : destinations[0]?.id) ?? null;
  // Real state, not derived from the URL every render -- switchDestination (below)
  // sets this directly so a switch can never get stuck on a URL update that silently
  // fails to commit. Observed directly on an iOS Safari session: raw
  // history.replaceState works fine, but Next's router.replace no-ops after a fresh
  // page load until some unrelated history mutation "wakes" the router back up --
  // after which it works again until the next reload. Rather than chase that, the app
  // no longer depends on the URL update succeeding at all.
  const [activeDestinationId, setActiveDestinationId] = useState<string | null>(null);
  const activeDestination = destinations.find((d) => d.id === activeDestinationId) ?? null;

  // Resolve the initial destination once, the first time destinations/URL/localStorage
  // give us something to work with -- mirrors the old URL-param-then-last-used-then-
  // oldest fallback chain, but only runs while nothing's been picked yet this session.
  useEffect(() => {
    if (activeDestinationId || !destinationsAndTypesLoaded) return;
    const initial = destinationParam ?? fallbackDestinationId;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initial) setActiveDestinationId(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDestinationId, destinationsAndTypesLoaded, destinationParam, fallbackDestinationId]);

  // Per-destination restaurant cache, so switching back to a destination already
  // visited this session renders instantly from cache instead of waiting on a fresh
  // network round trip -- syncRestaurants still runs in the background to refresh it.
  // A ref (not state) since writing it must never itself trigger a render.
  const restaurantCacheRef = useRef<Map<string, Restaurant[]>>(new Map());
  // Same pattern for the active destination's own Tags/Area lists, now that those are
  // scoped per destination too -- see syncDestinationTags below.
  const tagsCacheRef = useRef<Map<string, Tag[]>>(new Map());
  const areasCacheRef = useRef<Map<string, Tag[]>>(new Map());
  // Lets in-flight async calls (fetch responses, Realtime callbacks) check whether the
  // destination they were fetching for is still the active one by the time they
  // resolve, so a slow response for a destination the user already switched away from
  // can't clobber what's on screen.
  const activeDestinationIdRef = useRef(activeDestinationId);
  useEffect(() => {
    activeDestinationIdRef.current = activeDestinationId;
  }, [activeDestinationId]);

  // Remember this destination as the one to land on next time (next tab switch,
  // reload, or sign-in on this device) -- runs for every change, including the
  // canonicalization effect's own first write, so it stays current even if the
  // previously-remembered destination was deleted out from under it.
  useEffect(() => {
    if (activeDestinationId) setLastDestinationId(activeDestinationId);
  }, [activeDestinationId]);

  async function syncRestaurants(destinationId: string | null = activeDestinationId) {
    if (!destinationId) return;
    try {
      const data = await fetchRestaurants(destinationId);
      restaurantCacheRef.current.set(destinationId, data);
      if (destinationId === activeDestinationIdRef.current) {
        setRestaurants(data);
        setRestaurantsError(false);
      }
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error(err);
      if (destinationId === activeDestinationIdRef.current) setRestaurantsError(true);
    }
  }

  // Type is one taxonomy shared by every destination -- fetched once, no destination
  // dependency.
  async function syncTypes() {
    try {
      const ty = await fetchTags("type");
      setTypes(ty);
      setTagsError(false);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error(err);
      setTagsError(true);
    }
  }

  // Tags/Area are scoped to a single destination -- mirrors syncRestaurants' cache +
  // staleness-guard pattern so a destination switch never flashes the previous
  // destination's values while the fresh fetch is in flight.
  async function syncDestinationTags(destinationId: string | null = activeDestinationId) {
    if (!destinationId) return;
    try {
      const [ta, a] = await Promise.all([fetchTags("tags", destinationId), fetchTags("area", destinationId)]);
      tagsCacheRef.current.set(destinationId, ta);
      areasCacheRef.current.set(destinationId, a);
      if (destinationId === activeDestinationIdRef.current) {
        setTags(ta);
        setAreas(a);
        setTagsError(false);
      }
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error(err);
      if (destinationId === activeDestinationIdRef.current) setTagsError(true);
    }
  }

  // Combined refresh for consumers that just want "everything tag-related, current
  // destination" -- Settings' "Sync now", and Realtime tag-change handling below.
  async function syncTags() {
    await Promise.all([syncTypes(), syncDestinationTags()]);
  }

  async function syncDestinations() {
    try {
      const data = await fetchDestinations();
      setDestinations(data);
      setDestinationsError(false);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error(err);
      setDestinationsError(true);
    }
  }

  async function syncNow() {
    await Promise.all([syncRestaurants(), syncTags(), syncDestinations()]);
  }

  function patchRestaurantCache(restaurant: Restaurant) {
    setRestaurants((prev) => {
      const next = upsertByIdSortedByName(prev, restaurant);
      if (activeDestinationId) restaurantCacheRef.current.set(activeDestinationId, next);
      return next;
    });
    setLastPatchedRestaurant(restaurant);
  }

  function removeRestaurantsCache(ids: string[]) {
    const idSet = new Set(ids);
    setRestaurants((prev) => {
      const next = prev.filter((r) => !idSet.has(r.id));
      if (activeDestinationId) restaurantCacheRef.current.set(activeDestinationId, next);
      return next;
    });
  }

  function patchTagCache(tag: Tag) {
    const setter = { type: setTypes, tags: setTags, area: setAreas }[tag.kind];
    setter((prev) => upsertByIdSortedByName(prev, tag));
  }

  function removeTagFromCache(kind: TagKind, id: string) {
    const setter = { type: setTypes, tags: setTags, area: setAreas }[kind];
    setter((prev) => prev.filter((t) => t.id !== id));
  }

  function patchDestinationCache(destination: Destination) {
    setDestinations((prev) => upsertByIdSortedByCreatedAt(prev, destination));
  }

  function removeDestinationFromCache(id: string) {
    setDestinations((prev) => prev.filter((d) => d.id !== id));
  }

  function switchDestination(id: string | null) {
    if (id === activeDestinationId) return;
    if (id) setDestinationSwitching(true);
    setActiveDestinationId(id);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([syncDestinations(), syncTypes()]).finally(() => setDestinationsAndTypesLoaded(true));
  }, []);

  // Keep the URL's ?destination= in sync with activeDestinationId so it stays
  // shareable/reload-safe -- best-effort only (see activeDestinationId above), nothing
  // else depends on this actually committing.
  useEffect(() => {
    if (!activeDestinationId || destinationParam === activeDestinationId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("destination", activeDestinationId);
    router.replace(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDestinationId, destinationParam]);

  useEffect(() => {
    if (!destinationsAndTypesLoaded || !activeDestinationId) return;
    // Render whatever's cached for this destination immediately (empty if we've never
    // fetched it) so a destination switch never shows the previous destination's rows
    // while the fresh fetch below is in flight -- see restaurantCacheRef/tagsCacheRef/
    // areasCacheRef above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRestaurants(restaurantCacheRef.current.get(activeDestinationId) ?? []);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTags(tagsCacheRef.current.get(activeDestinationId) ?? []);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAreas(areasCacheRef.current.get(activeDestinationId) ?? []);
    Promise.all([syncRestaurants(activeDestinationId), syncDestinationTags(activeDestinationId)]).finally(() => {
      setInitialLoadDone(true);
      setDestinationSwitching(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationsAndTypesLoaded, activeDestinationId]);

  useEffect(() => {
    const channel = supabase
      .channel("restaurant-data-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => syncRestaurants())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_tags" },
        () => syncRestaurants()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "tags" }, () => syncTags())
      .on("postgres_changes", { event: "*", schema: "public", table: "destinations" }, () => syncDestinations())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDestinationId]);

  if (!initialLoadDone) return <Loading />;

  function handleSaved(restaurant: Restaurant) {
    setSheet({ kind: "detail", restaurant });
    patchRestaurantCache(restaurant);
  }

  return (
    <RestaurantUIContext.Provider
      value={{
        openDetail: (r) => setSheet({ kind: "detail", restaurant: r }),
        openEdit: (r) => setSheet({ kind: "edit", restaurant: r }),
        openAdd: () => setSheet({ kind: "add" }),
        openAddInline: (initialQuery, onSaved) => setSheet({ kind: "add-inline", initialQuery, onSaved }),
        restaurants,
        lastPatchedRestaurant,
        types,
        tags,
        areas,
        restaurantsError,
        tagsError,
        lastSyncedAt,
        destinations,
        activeDestinationId,
        activeDestination,
        destinationsError,
        destinationSwitching,
        switchDestination,
        syncNow,
        syncRestaurants,
        syncTags,
        syncDestinations,
        patchRestaurantCache,
        removeRestaurantsCache,
        patchTagCache,
        removeTagFromCache,
        patchDestinationCache,
        removeDestinationFromCache,
      }}
    >
      <Header onAdd={() => setSheet({ kind: "add" })} />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>

      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        paddingClassName={sheet?.kind === "detail" ? "p-5" : "px-5"}
      >
        {sheet?.kind === "detail" && (
          <RestaurantDetailView
            key={sheet.restaurant.id}
            restaurant={sheet.restaurant}
            onEdit={() => setSheet({ kind: "edit", restaurant: sheet.restaurant })}
            onClose={() => setSheet(null)}
          />
        )}
        {sheet?.kind === "add" && (
          <AddRestaurantFlow onSaved={handleSaved} onClose={() => setSheet(null)} />
        )}
        {sheet?.kind === "edit" && (
          <AddRestaurantFlow
            editing={sheet.restaurant}
            onSaved={handleSaved}
            onClose={() => setSheet(null)}
          />
        )}
        {sheet?.kind === "add-inline" && (
          <AddRestaurantFlow
            initialQuery={sheet.initialQuery}
            onSaved={(r) => {
              setSheet(null);
              sheet.onSaved(r);
            }}
            onClose={() => setSheet(null)}
          />
        )}
      </BottomSheet>

      {destinationSwitching && <DestinationSwitchOverlay />}
    </RestaurantUIContext.Provider>
  );
}
