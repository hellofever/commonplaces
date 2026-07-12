"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchRestaurants } from "@/lib/restaurants";
import { categoryColor, categoryLabel } from "@/lib/categories";
import { useRestaurantUI } from "@/components/AppShell";
import type { Restaurant } from "@/lib/types";

export default function SheetPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const { openEdit, refreshToken } = useRestaurantUI();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    fetchRestaurants().then(setRestaurants).catch(console.error);
  }, [refreshToken]);

  const q = query.trim().toLowerCase();
  const filtered = restaurants.filter(
    (r) =>
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.address.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
  );

  return (
    <div className="flex-1 overflow-auto p-4">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-black/50 dark:border-white/10 dark:text-white/50">
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Address</th>
            <th className="px-3 py-2">Phone</th>
            <th className="px-3 py-2">Price</th>
            <th className="px-3 py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr
              key={r.id}
              onClick={() => openEdit(r)}
              className="cursor-pointer border-b border-black/5 hover:bg-black/[.02] dark:border-white/5 dark:hover:bg-white/5"
            >
              <td className="px-3 py-2 font-medium">{r.name}</td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: categoryColor(r.category) }}
                  />
                  {categoryLabel(r.category)}
                </span>
              </td>
              <td className="px-3 py-2 text-black/70 dark:text-white/70">{r.address}</td>
              <td className="px-3 py-2 text-black/70 dark:text-white/70">{r.phone ?? "—"}</td>
              <td className="px-3 py-2">{r.price_level ? "$".repeat(r.price_level) : "—"}</td>
              <td className="px-3 py-2 text-black/70 dark:text-white/70">{r.notes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="p-6 text-center text-sm text-black/50 dark:text-white/50">
          No restaurants yet.
        </p>
      )}
    </div>
  );
}
