"use client";

import { useEffect, useState } from "react";
import { TagPicker } from "./TagPicker";
import { PhotoUploader, type PhotoUploadState } from "./PhotoUploader";
import { useRestaurantUI } from "./AppShell";
import type { Restaurant, RestaurantFormValues } from "@/lib/types";

const EMPTY_PHOTO_UPLOAD_STATE: PhotoUploadState = { pendingStoragePaths: [], uploading: false };

export function RestaurantForm({
  initial,
  restaurantId,
  onSubmit,
  submitLabel = "Save restaurant",
  suggestedTagName,
}: {
  initial: Partial<RestaurantFormValues>;
  restaurantId?: string;
  onSubmit: (values: RestaurantFormValues, pendingPhotoPaths: string[]) => Promise<Restaurant>;
  submitLabel?: string;
  suggestedTagName?: string | null;
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [typeIds, setTypeIds] = useState<string[]>(initial.typeIds ?? []);
  const [tagIds, setTagIds] = useState<string[]>(initial.tagIds ?? []);
  const [areaIds, setAreaIds] = useState<string[]>(initial.areaIds ?? []);
  const [primaryTagId, setPrimaryTagId] = useState<string | null>(initial.primary_tag_id ?? null);
  const [address, setAddress] = useState(initial.address ?? "");
  const [lat, setLat] = useState<number | "">(initial.lat ?? "");
  const [lng, setLng] = useState<number | "">(initial.lng ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [priceLevel, setPriceLevel] = useState<number | null>(initial.price_level ?? null);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [photoUpload, setPhotoUpload] = useState<PhotoUploadState>(EMPTY_PHOTO_UPLOAD_STATE);
  const { types: typeOptions } = useRestaurantUI();
  const [editingLocation, setEditingLocation] = useState(initial.lat === undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep primaryTagId valid as the type selection changes: auto-pick when there's
  // exactly one, clear/reassign if the current primary was removed.
  useEffect(() => {
    if (typeIds.length === 0) {
      setPrimaryTagId(null);
    } else if (typeIds.length === 1) {
      setPrimaryTagId(typeIds[0]);
    } else if (primaryTagId && !typeIds.includes(primaryTagId)) {
      setPrimaryTagId(typeIds[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeIds]);

  const inputClass =
    "rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5";
  const selectedTypeOptions = typeOptions.filter((t) => typeIds.includes(t.id));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) {
      setError("Name is required.");
      return;
    }
    if (typeIds.length === 0 || typeIds.length > 3) {
      setError("Pick 1 to 3 types.");
      return;
    }
    if (areaIds.length === 0) {
      setError("Pick at least one area.");
      return;
    }
    if (photoUpload.uploading) {
      setError("Photos are still uploading — wait for them to finish.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(
        {
          name,
          primary_tag_id: primaryTagId,
          lat: lat === "" ? null : Number(lat),
          lng: lng === "" ? null : Number(lng),
          address: address || null,
          phone: phone || null,
          website: website || null,
          price_level: priceLevel,
          opening_hours: initial.opening_hours ?? null,
          google_place_id: initial.google_place_id ?? null,
          notes: notes || null,
          photo_url: initial.photo_url ?? null,
          typeIds,
          tagIds,
          areaIds,
        },
        photoUpload.pendingStoragePaths
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>

      <TagPicker
        kind="type"
        label="Type"
        multiple
        maxSelections={3}
        selectedIds={typeIds}
        onChange={setTypeIds}
        initialQuery={suggestedTagName ?? undefined}
      />

      {selectedTypeOptions.length > 1 && (
        <div className="flex flex-col gap-1.5 text-sm">
          <span>Primary type (colors the map pin)</span>
          <div className="flex flex-wrap gap-1.5">
            {selectedTypeOptions.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPrimaryTagId(t.id)}
                className="rounded-full border px-2.5 py-1 text-xs"
                style={
                  primaryTagId === t.id
                    ? { background: t.color ?? undefined, borderColor: t.color ?? undefined, color: "white" }
                    : { borderColor: t.color ?? undefined, color: t.color ?? undefined }
                }
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <TagPicker kind="tags" label="Tags" multiple selectedIds={tagIds} onChange={setTagIds} />

      <TagPicker kind="area" label="Area" multiple selectedIds={areaIds} onChange={setAreaIds} />

      <label className="flex flex-col gap-1 text-sm">
        Address
        <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center justify-between">
          <span>Location (optional)</span>
          {!editingLocation && (
            <button
              type="button"
              onClick={() => setEditingLocation(true)}
              className="text-xs text-black/60 underline dark:text-white/60"
            >
              Edit
            </button>
          )}
        </div>
        {editingLocation ? (
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={lat}
              onChange={(e) => setLat(e.target.value === "" ? "" : parseFloat(e.target.value))}
              className={inputClass}
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={lng}
              onChange={(e) => setLng(e.target.value === "" ? "" : parseFloat(e.target.value))}
              className={inputClass}
            />
          </div>
        ) : (
          <p className="text-black/70 dark:text-white/70">
            {lat != null && lng != null ? `${lat}, ${lng}` : "Not set — won't appear on the map"}
          </p>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Phone
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Website
        <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} />
      </label>

      <div className="flex flex-col gap-1.5 text-sm">
        <span>Price level</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setPriceLevel(priceLevel === level ? null : level)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                priceLevel === level
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-black/15 text-black/70 dark:border-white/15 dark:text-white/70"
              }`}
            >
              {"$".repeat(level)}
            </button>
          ))}
        </div>
      </div>

      <PhotoUploader restaurantId={restaurantId} onChange={setPhotoUpload} />

      <label className="flex flex-col gap-1 text-sm">
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving || photoUpload.uploading}
        className="mt-1 rounded-lg bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {photoUpload.uploading ? "Uploading photos…" : saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
