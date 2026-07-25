"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Gear, List as ListIcon, Plus } from "@phosphor-icons/react";
import { BottomSheet, ModalHeader } from "./BottomSheet";
import { Logo } from "./Logo";
import { LogoSmall } from "./LogoSmall";
import { Settings } from "./Settings";
import { MapSearchExpand, SearchField } from "./MapSearchExpand";
import { DestinationSwitcher } from "./DestinationSwitcher";
import { isViewName, type ViewName } from "@/lib/view";

const TABS: { view: ViewName; label: string }[] = [
  { view: "map", label: "Map" },
  { view: "list", label: "List" },
  { view: "sheet", label: "Sheet" },
];

export function Header({ onAdd }: { onAdd: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const view: ViewName = isViewName(viewParam) ? viewParam : "map";
  const q = searchParams.get("q") ?? "";
  const [settingsOpen, setSettingsOpen] = useState(false);
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
          <DestinationSwitcher />
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
          title={
            <div className="flex items-center gap-3">
              <Logo className="h-[13px] w-auto" />
              <DestinationSwitcher beforeOpenCreate={() => setMenuOpen(false)} />
            </div>
          }
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
        <div className="mt-2 flex flex-col gap-1 border-t border-black/10 pt-2 text-sm dark:border-white/10">
          <button
            onClick={() => {
              setMenuOpen(false);
              onAdd();
            }}
            className="flex items-center justify-center gap-1.5 rounded-full bg-red-500 px-4 py-3 font-heading text-sm uppercase text-white"
          >
            <Plus weight="bold" size={16} />
            Add Place
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
    </header>
  );
}
