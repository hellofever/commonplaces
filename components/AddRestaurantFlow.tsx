"use client";

import { useState } from "react";
import { RestaurantForm } from "./RestaurantForm";
import { suggestCategory } from "@/lib/categories";
import { findByPlaceId, insertRestaurant, updateRestaurant } from "@/lib/restaurants";
import type { Restaurant, RestaurantInput } from "@/lib/types";

interface SearchResult {
  placeId: string;
  name: string;
  address: string;
}

export function AddRestaurantFlow({
  editing,
  onDone,
}: {
  editing?: Restaurant;
  onDone: () => void;
}) {
  const [step, setStep] = useState<"search" | "results" | "form">(editing ? "form" : "search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formInitial, setFormInitial] = useState<Partial<RestaurantInput>>(editing ?? {});
  const [duplicate, setDuplicate] = useState<Restaurant | null>(null);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setDuplicate(null);
    try {
      const res = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
      setSearched(true);
      setStep("results");
    } finally {
      setLoading(false);
    }
  }

  async function pickResult(result: SearchResult) {
    setLoading(true);
    try {
      const existing = await findByPlaceId(result.placeId);
      if (existing) {
        setDuplicate(existing);
        return;
      }

      const res = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: result.placeId }),
      });
      const details = await res.json();

      setFormInitial({
        name: details.name,
        address: details.address,
        lat: details.lat,
        lng: details.lng,
        phone: details.phone,
        website: details.website,
        price_level: details.priceLevel,
        opening_hours: details.openingHours,
        google_place_id: details.placeId,
        category: suggestCategory(details.primaryType),
      });
      setStep("form");
    } finally {
      setLoading(false);
    }
  }

  function addManually() {
    setFormInitial({});
    setStep("form");
  }

  async function handleSave(values: RestaurantInput) {
    if (editing) {
      await updateRestaurant(editing.id, values);
    } else {
      await insertRestaurant(values);
    }
    onDone();
  }

  if (duplicate) {
    return (
      <div className="flex flex-col gap-3 pr-6">
        <h2 className="text-lg font-semibold">Already on your list</h2>
        <p className="text-sm text-black/70 dark:text-white/70">
          <b>{duplicate.name}</b> is already saved.
        </p>
        <button
          onClick={() => {
            setFormInitial(duplicate);
            setDuplicate(null);
            setStep("form");
          }}
          className="rounded-lg bg-black py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          View / edit it instead
        </button>
      </div>
    );
  }

  if (step === "form") {
    return (
      <>
        <h2 className="mb-3 pr-6 text-lg font-semibold">
          {editing ? "Edit restaurant" : "Add restaurant"}
        </h2>
        <RestaurantForm initial={formInitial} onSubmit={handleSave} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3 pr-6">
      <h2 className="text-lg font-semibold">Add restaurant</h2>
      <form onSubmit={runSearch} className="flex gap-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a restaurant…"
          className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
        />
        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          {loading ? "…" : "Search"}
        </button>
      </form>
      <button
        onClick={addManually}
        className="w-fit text-sm text-black/60 underline dark:text-white/60"
      >
        or add manually
      </button>

      {step === "results" && (
        <div className="flex flex-col gap-2">
          {searched && results.length === 0 && (
            <p className="text-sm text-black/60 dark:text-white/60">
              No matches — try a different search or add manually.
            </p>
          )}
          {results.map((r) => (
            <button
              key={r.placeId}
              onClick={() => pickResult(r)}
              className="flex flex-col rounded-lg border border-black/10 px-3 py-2 text-left text-sm hover:bg-black/[.03] dark:border-white/10 dark:hover:bg-white/5"
            >
              <span className="font-medium">{r.name}</span>
              <span className="text-black/60 dark:text-white/60">{r.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
