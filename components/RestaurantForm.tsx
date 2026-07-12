"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import type { RestaurantInput } from "@/lib/types";

export function RestaurantForm({
  initial,
  onSubmit,
  submitLabel = "Save restaurant",
}: {
  initial: Partial<RestaurantInput>;
  onSubmit: (values: RestaurantInput) => Promise<void>;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<Partial<RestaurantInput>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof RestaurantInput>(key: K, value: RestaurantInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !values.name ||
      !values.category ||
      values.lat == null ||
      values.lng == null ||
      !values.address
    ) {
      setError("Name, category, address and location are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values as RestaurantInput);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 pr-6">
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          required
          value={values.name ?? ""}
          onChange={(e) => set("name", e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Category
        <select
          required
          value={values.category ?? ""}
          onChange={(e) => set("category", e.target.value as RestaurantInput["category"])}
          className={inputClass}
        >
          <option value="" disabled>
            Choose a category
          </option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Address
        <input
          required
          value={values.address ?? ""}
          onChange={(e) => set("address", e.target.value)}
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Latitude
          <input
            required
            type="number"
            step="any"
            value={values.lat ?? ""}
            onChange={(e) => set("lat", parseFloat(e.target.value))}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Longitude
          <input
            required
            type="number"
            step="any"
            value={values.lng ?? ""}
            onChange={(e) => set("lng", parseFloat(e.target.value))}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Phone
        <input
          value={values.phone ?? ""}
          onChange={(e) => set("phone", e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Website
        <input
          value={values.website ?? ""}
          onChange={(e) => set("website", e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Price level
        <select
          value={values.price_level ?? ""}
          onChange={(e) => set("price_level", e.target.value ? Number(e.target.value) : null)}
          className={inputClass}
        >
          <option value="">Not set</option>
          <option value="1">$</option>
          <option value="2">$$</option>
          <option value="3">$$$</option>
          <option value="4">$$$$</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Notes
        <textarea
          value={values.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className={inputClass}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-1 rounded-lg bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
