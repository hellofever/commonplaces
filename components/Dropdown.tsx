"use client";

import { useEffect, useRef, useState } from "react";

// Shared pill styling for anything that opens a Dropdown -- keep Filters/Columns/etc.
// visually identical by importing this instead of hand-rolling the classes again.
export const dropdownTriggerClass =
  "flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-black/70 dark:border-white/10 dark:text-white/70";

// A floating panel anchored to its trigger, not a pushdown accordion -- opening it
// doesn't reflow anything below. Closes on any click outside the trigger+panel (tracked
// via containment, not per-child stopPropagation, so every interaction inside --
// checkboxes, labels, nested buttons -- keeps it open for free).
export function Dropdown({
  trigger,
  children,
  align = "left",
  panelClassName = "w-56",
}: {
  trigger: (state: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={`absolute top-full z-20 mt-1 rounded-lg border border-black/10 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-zinc-900 ${
            align === "right" ? "right-0" : "left-0"
          } ${panelClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
