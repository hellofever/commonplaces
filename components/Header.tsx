"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CaretDown, Gear, List as ListIcon, MapPin, Plus } from "@phosphor-icons/react";
import { BottomSheet, ModalHeader } from "./BottomSheet";
import { Logo } from "./Logo";
import { LogoSmall } from "./LogoSmall";
import { Settings } from "./Settings";
import { MapSearchExpand, SearchField } from "./MapSearchExpand";
import { DestinationPicker } from "./DestinationPicker";
import { useRestaurantUI } from "./AppShell";
import { isViewName, type ViewName } from "@/lib/view";

const TABS: { view: ViewName; label: string }[] = [
  { view: "map", label: "Map" },
  { view: "list", label: "List" },
  { view: "sheet", label: "Sheet" },
];

// Baked in at build time via next.config.ts's `env` (see the comment there for why
// that, not a .env file) -- NEXT_PUBLIC_BUILD_TIME is the build's own clock, which on
// Vercel starts within seconds of the push that triggered it, so it reads as "time of
// the push" for the purpose of eyeballing which deploy you're looking at.
const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA ?? "local";
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Header({ onAdd }: { onAdd: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const view: ViewName = isViewName(viewParam) ? viewParam : "map";
  const q = searchParams.get("q") ?? "";
  const { activeDestination } = useRestaurantUI();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }

  // Carries the whole current query string forward and only swaps `view` -- every
  // view's own params are uniquely named now (List's ?listLayout=/?types=, Sheet's
  // ?sheetTypes=/?sheetSort=, Map's ?mapTypes=, etc., see the collision notes in
  // ListView/SheetView/MapSearchExpand), so there's nothing left to collide and no
  // reason to drop them -- Map/List/Sheet stay mounted across a tab switch (see
  // app/page.tsx), so their own state should survive right along with them instead of
  // resetting to defaults every time you switch away and back.
  //
  // Both <Link>s below pass `replace` (confirmed root cause via a real touch-emulated
  // repro): without it, every tab switch pushes a new browser history entry, so a
  // back-navigation -- including iOS Safari's edge-swipe-back gesture, easily triggered
  // by accident -- steps back through previously-visited tabs instead of leaving the
  // app, which looks exactly like "the app reverts to the map" for no reason.
  function tabHref(tabView: ViewName) {
    const params = new URLSearchParams(searchParams.toString());
    if (tabView === "map") params.delete("view");
    else params.set("view", tabView);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-white/90 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 backdrop-blur dark:border-white/10 dark:bg-black/80">
      {/* Mobile */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Menu"
          className="flex shrink-0 items-center gap-2 text-black/60 dark:text-white/60"
        >
          <ListIcon size={18} />
          <LogoSmall className="h-4 w-auto" />
        </button>
        <div className="flex flex-1 justify-center">
          {view === "map" ? (
            <MapSearchExpand />
          ) : (
            <SearchField value={q} onChange={handleSearch} placeholder="Search restaurants…" />
          )}
        </div>
      </div>

      {/* Desktop: a 1fr/auto/1fr grid keeps the search bar centered on the header
          regardless of how wide the nav/destination-switcher or the action buttons are
          -- a plain flex row centers relative to leftover space between them instead,
          which drifts off-viewport-center whenever the two side groups' widths differ. */}
      <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-3">
        <div className="flex items-center gap-4">
          <LogoSmall className="h-4 w-auto lg:hidden" />
          <Logo className="hidden h-4 w-auto lg:block" />
          <button
            onClick={() => setDestinationOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-black/10 px-2.5 text-sm text-black/70 dark:border-white/10 dark:text-white/70"
          >
            <MapPin size={14} />
            <span className="max-w-[9rem] truncate">{activeDestination?.name ?? "Destination"}</span>
            <CaretDown size={12} weight="bold" className="opacity-60" />
          </button>
          <nav className="flex items-center gap-1 text-sm">
            {TABS.map((tab) => {
              const active = view === tab.view;
              return (
                <Link
                  key={tab.view}
                  href={tabHref(tab.view)}
                  replace
                  className={`rounded-md px-2.5 py-1.5 transition-colors ${
                    active
                      ? "text-black dark:text-white"
                      : "text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="w-full max-w-[600px] justify-self-center">
          {view === "map" ? (
            <MapSearchExpand />
          ) : (
            <SearchField value={q} onChange={handleSearch} placeholder="Search restaurants…" />
          )}
        </div>
        <div className="flex items-center justify-self-end gap-2">
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 font-heading text-sm uppercase text-white"
          >
            <Plus weight="bold" size={16} />
            Add Place
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-black/60 dark:border-white/10 dark:text-white/60"
          >
            <Gear size={18} />
          </button>
        </div>
      </div>

      <BottomSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        side="left"
        radiusClassName=""
        widthClassName="md:max-w-md"
        heightClassName="h-dvh! md:h-fit!"
      >
        <ModalHeader
          title={<Logo className="h-[13px] w-auto" />}
          onClose={() => setMenuOpen(false)}
          className="pt-[env(safe-area-inset-top)] md:pt-0"
        />
        <nav className="mt-4 flex flex-col gap-1">
          {TABS.map((tab) => {
            const active = view === tab.view;
            return (
              <Link
                key={tab.view}
                href={tabHref(tab.view)}
                replace
                onClick={() => setMenuOpen(false)}
                className={`flex min-h-14 items-center rounded-md px-3 font-heading text-xl font-semibold transition-colors ${
                  active
                    ? "bg-black/[.04] text-black dark:bg-white/[.08] dark:text-white"
                    : "text-black/60 hover:bg-black/[.03] dark:text-white/60 dark:hover:bg-white/[.05]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 flex flex-col gap-1 text-sm">
          <button
            onClick={() => {
              setMenuOpen(false);
              onAdd();
            }}
            className="mb-2 flex items-center justify-center gap-1.5 rounded-full bg-red-500 px-4 py-3 font-heading text-sm uppercase text-white"
          >
            <Plus weight="bold" size={16} />
            Add Place
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              setDestinationOpen(true);
            }}
            className="flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-black/60 hover:bg-black/[.03] dark:text-white/60 dark:hover:bg-white/[.05]"
          >
            <MapPin size={16} />
            <span className="flex-1 truncate">{activeDestination?.name ?? "Destination"}</span>
            <CaretDown size={14} weight="bold" className="shrink-0 opacity-60" />
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              setSettingsOpen(true);
            }}
            className="flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-black/60 hover:bg-black/[.03] dark:text-white/60 dark:hover:bg-white/[.05]"
          >
            <Gear size={16} />
            Settings
          </button>
        </div>
        <div className="mt-6 border-t border-black/10 pt-3 text-xs text-black/40 dark:border-white/10 dark:text-white/40">
          Build {BUILD_SHA.slice(0, 7)} · {BUILD_TIME ? timeAgo(BUILD_TIME) : "unknown"}
        </div>
      </BottomSheet>

      <BottomSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        widthClassName="sm:max-w-2xl"
        heightClassName="h-dvh! sm:h-[600px]!"
      >
        <ModalHeader
          title={<h2 className="text-lg">Settings</h2>}
          onClose={() => setSettingsOpen(false)}
          className="mb-4 pt-[env(safe-area-inset-top)] sm:pt-0"
        />
        <div className="flex min-h-0 flex-1 flex-col">
          <Settings />
        </div>
      </BottomSheet>

      <BottomSheet open={destinationOpen} onClose={() => setDestinationOpen(false)}>
        <ModalHeader
          title={<h2 className="text-lg">Destination</h2>}
          onClose={() => setDestinationOpen(false)}
          className="mb-4 pt-[env(safe-area-inset-top)] sm:pt-0"
        />
        <DestinationPicker onSelect={() => setDestinationOpen(false)} />
      </BottomSheet>
    </header>
  );
}
