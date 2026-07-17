import { supabase } from "./supabase";
import type { RestaurantPhoto } from "./types";

export const MAX_RESTAURANT_PHOTOS = 10;

const BUCKET = "restaurant-photos";
const SIGNED_URL_TTL_SECONDS = 3600;

export async function fetchRestaurantPhotos(
  restaurantId: string
): Promise<(RestaurantPhoto & { url: string })[]> {
  const { data, error } = await supabase
    .from("restaurant_photos")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const photos = data as RestaurantPhoto[];
  return Promise.all(
    photos.map(async (photo) => {
      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(photo.storage_path, SIGNED_URL_TTL_SECONDS);
      if (signError) throw signError;
      return { ...photo, url: signed.signedUrl };
    })
  );
}

// Uploads to Storage only -- doesn't touch restaurant_photos. `folder` is the
// restaurant's id when it already exists (edit mode), or a client-generated
// placeholder id when it doesn't yet (add mode) -- the restaurant_photos row can only
// be created once the restaurant row exists (FK), so add-mode uploads sit unlinked in
// Storage until linkPendingPhotos runs at save time.
export async function uploadPhotoFile(folder: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export async function linkPhotoToRestaurant(
  restaurantId: string,
  storagePath: string
): Promise<RestaurantPhoto> {
  const { data, error } = await supabase
    .from("restaurant_photos")
    .insert({ restaurant_id: restaurantId, storage_path: storagePath })
    .select()
    .single();
  if (error) throw error;
  return data as RestaurantPhoto;
}

export async function linkPendingPhotos(restaurantId: string, storagePaths: string[]): Promise<void> {
  for (const path of storagePaths) {
    await linkPhotoToRestaurant(restaurantId, path);
  }
}

export async function deletePhotoObject(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw error;
}

export async function deleteRestaurantPhoto(id: string): Promise<void> {
  const { data: photo, error: fetchError } = await supabase
    .from("restaurant_photos")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  await deletePhotoObject(photo.storage_path);

  const { error: deleteError } = await supabase.from("restaurant_photos").delete().eq("id", id);
  if (deleteError) throw deleteError;
}
