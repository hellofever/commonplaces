"use client";

import { useClusteringEnabled } from "@/lib/preferences";

export function MapSettings() {
  const [clusteringEnabled, setClusteringEnabled] = useClusteringEnabled();

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-black/50 dark:text-white/50">Marker clustering</span>
      <button
        type="button"
        role="switch"
        aria-checked={clusteringEnabled}
        onClick={() => setClusteringEnabled(!clusteringEnabled)}
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
          clusteringEnabled ? "bg-red-500" : "bg-black/15 dark:bg-white/15"
        }`}
      >
        <span
          // left-0.5 pins the untranslated rest position explicitly -- without it, an
          // absolutely-positioned span with no left/right set resolves its static
          // position ambiguously (WebKit landed on ~20px in here, not flush-left),
          // pushing the translated "on" position past the track's right edge entirely.
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            clusteringEnabled ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </button>
      <span className="text-xs text-black/40 dark:text-white/40">
        Groups nearby pins into a single count when zoomed out. Saved on this device only.
      </span>
    </div>
  );
}
