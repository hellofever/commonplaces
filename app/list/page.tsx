"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchRestaurants } from "@/lib/restaurants";
import { tagColor } from "@/lib/tags";
import { useRestaurantUI } from "@/components/AppShell";
import type { Restaurant } from "@/lib/types";

function matches(r: Restaurant, q: string): boolean {
  if (!q) return true;
  const tagNames = [...r.tags, ...r.areas, ...(r.city ? [r.city] : [])].map((t) =>
    t.name.toLowerCase()
  );
  return (
    r.name.toLowerCase().includes(q) ||
    r.address.toLowerCase().includes(q) ||
    tagNames.some((n) => n.includes(q))
  );
}

export default function ListPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const { openDetail, openAdd, refreshToken } = useRestaurantUI();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchRestaurants()
      .then(setRestaurants)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshToken]);

  const q = query.trim().toLowerCase();
  const filtered = restaurants.filter((r) => matches(r, q));

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-[58px] animate-pulse rounded-lg bg-black/5 dark:bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-black/50 dark:text-white/50">There are no places added.</p>
        <button
          onClick={openAdd}
          className="rounded-full bg-[#bd5a1f] px-4 py-2 text-sm font-medium text-white"
        >
          Add a place
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
      {filtered.map((r) => (
        <button
          key={r.id}
          onClick={() => openDetail(r)}
          className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2.5 text-left dark:border-white/10"
        >
          <span
            className="h-2 w-2 flex-none rounded-full"
            style={{ background: tagColor(r.primaryTag) }}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              {r.is_favourite && <span className="text-[#bd5a1f]">★ </span>}
              {r.name}
            </span>
            <span className="block text-xs text-black/50 dark:text-white/50">
              {[...r.tags.map((t) => t.name), ...r.areas.map((a) => a.name)].join(" · ") ||
                r.address}
            </span>
          </span>
          <span className="text-black/40">›</span>
        </button>
      ))}
      {filtered.length === 0 && (
        <p className="p-6 text-center text-sm text-black/50 dark:text-white/50">
          No matches for that search.
        </p>
      )}
    </div>
  );
}
