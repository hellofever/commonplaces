"use client";

import { useEffect, useRef, useState } from "react";
import { CircleNotch, X } from "@phosphor-icons/react";
import {
  deletePhotoObject,
  deleteRestaurantPhoto,
  fetchRestaurantPhotos,
  linkPhotoToRestaurant,
  MAX_RESTAURANT_PHOTOS,
  uploadPhotoFile,
} from "@/lib/photos";
import { FadeImage } from "./FadeImage";

type PhotoStatus = "uploading" | "done" | "error";

interface PhotoItem {
  key: string;
  previewUrl: string;
  isObjectUrl: boolean;
  status: PhotoStatus;
  storagePath?: string;
  dbId?: string;
  errorMessage?: string;
}

export interface PhotoUploadState {
  // Uploaded to Storage but not yet linked to a restaurant row -- only ever
  // non-empty in add mode (no restaurantId yet). The caller links these at save time.
  pendingStoragePaths: string[];
  uploading: boolean;
}

// Photos upload to Storage the moment they're picked/dropped, independent of the
// parent form's Save button -- see lib/photos.ts for why linking to a restaurant row
// is sometimes deferred (add mode) and sometimes immediate (edit mode).
export function PhotoUploader({
  restaurantId,
  onChange,
}: {
  restaurantId?: string;
  onChange: (state: PhotoUploadState) => void;
}) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(!!restaurantId);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const tempFolderRef = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    fetchRestaurantPhotos(restaurantId)
      .then((existing) => {
        if (cancelled) return;
        setPhotos((prev) => [
          ...existing.map((p) => ({
            key: p.id,
            previewUrl: p.url,
            isObjectUrl: false,
            status: "done" as const,
            storagePath: p.storage_path,
            dbId: p.id,
          })),
          ...prev,
        ]);
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  useEffect(() => {
    onChange({
      pendingStoragePaths: photos
        .filter((p) => p.status === "done" && !p.dbId)
        .map((p) => p.storagePath!),
      uploading: photos.some((p) => p.status === "uploading"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  useEffect(() => {
    return () => {
      photos.forEach((p) => {
        if (p.isObjectUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const atLimit = photos.length >= MAX_RESTAURANT_PHOTOS;

  async function startUpload(file: File) {
    const key = crypto.randomUUID();
    setPhotos((prev) => [
      ...prev,
      { key, previewUrl: URL.createObjectURL(file), isObjectUrl: true, status: "uploading" },
    ]);

    try {
      const folder = restaurantId ?? tempFolderRef.current;
      const storagePath = await uploadPhotoFile(folder, file);

      if (restaurantId) {
        const row = await linkPhotoToRestaurant(restaurantId, storagePath);
        setPhotos((prev) =>
          prev.map((p) => (p.key === key ? { ...p, status: "done", storagePath, dbId: row.id } : p))
        );
      } else {
        setPhotos((prev) => (prev.map((p) => (p.key === key ? { ...p, status: "done", storagePath } : p))));
      }
    } catch (err) {
      setPhotos((prev) =>
        prev.map((p) =>
          p.key === key
            ? { ...p, status: "error", errorMessage: err instanceof Error ? err.message : "Upload failed" }
            : p
        )
      );
    }
  }

  function addFiles(fileList: FileList | File[] | null) {
    if (!fileList) return;
    const remaining = MAX_RESTAURANT_PHOTOS - photos.length;
    if (remaining <= 0) return;
    Array.from(fileList)
      .slice(0, remaining)
      .forEach((file) => startUpload(file));
    if (inputRef.current) inputRef.current.value = "";
  }

  async function removePhoto(key: string) {
    const photo = photos.find((p) => p.key === key);
    if (!photo || photo.status === "uploading") return;

    setPhotos((prev) => prev.filter((p) => p.key !== key));
    if (photo.isObjectUrl) URL.revokeObjectURL(photo.previewUrl);
    if (photo.status === "error") return;

    try {
      if (photo.dbId) {
        await deleteRestaurantPhoto(photo.dbId);
      } else if (photo.storagePath) {
        await deletePhotoObject(photo.storagePath);
      }
    } catch {
      // Already gone from the grid -- a failed cleanup call just leaves an orphaned
      // Storage object behind rather than resurrecting the item or blocking the user.
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes("Files")) setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);
    addFiles(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")));
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex items-center justify-between">
        <span>Photos</span>
        <span className="text-xs text-black/50 dark:text-white/50">
          {photos.length}/{MAX_RESTAURANT_PHOTOS}
        </span>
      </div>

      <div
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-wrap gap-2 rounded-lg p-1 transition-colors ${
          dragActive ? "bg-black/5 outline outline-2 outline-dashed outline-black/30 dark:bg-white/10 dark:outline-white/30" : ""
        }`}
      >
        {photos.map((photo) => (
          <div key={photo.key} className="relative h-20 w-20 overflow-hidden rounded-lg">
            <FadeImage
              src={photo.previewUrl}
              className={`h-full w-full ${photo.status === "uploading" ? "opacity-50" : ""}`}
            />

            {photo.status !== "uploading" && (
              <button
                type="button"
                onClick={() => removePhoto(photo.key)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X size={12} weight="bold" />
              </button>
            )}

            {photo.status === "uploading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <CircleNotch size={22} weight="bold" className="animate-spin text-white" />
              </div>
            )}

            {photo.status === "error" && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-600/70 px-1 text-center text-[10px] text-white">
                Failed
              </div>
            )}
          </div>
        ))}

        {!atLimit && (
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-black/25 text-xs text-black/60 dark:border-white/25 dark:text-white/60">
            + Add
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => addFiles(e.target.files)}
              className="hidden"
            />
          </label>
        )}
      </div>

      {loadingExisting && <p className="text-xs text-black/50 dark:text-white/50">Loading photos…</p>}
    </div>
  );
}
