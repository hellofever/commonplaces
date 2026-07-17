-- User-uploaded photos for a restaurant (up to 10, enforced client-side). Separate
-- from the existing `restaurants.photo_url` column, which is reserved for a later,
-- unrelated "auto-resolve a Google Places photo" feature.
create table restaurant_photos (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  storage_path   text not null,
  created_at     timestamptz not null default now()
);

create index restaurant_photos_restaurant_idx on restaurant_photos (restaurant_id);

alter table restaurant_photos enable row level security;

create policy "authenticated read" on restaurant_photos
  for select using (auth.role() = 'authenticated');
create policy "authenticated write" on restaurant_photos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Private bucket -- reads go through signed URLs (see lib/photos.ts), matching the
-- auth boundary every other piece of data in this app sits behind.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'restaurant-photos',
  'restaurant-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
);

create policy "authenticated read restaurant photos" on storage.objects
  for select using (bucket_id = 'restaurant-photos' and auth.role() = 'authenticated');
create policy "authenticated write restaurant photos" on storage.objects
  for insert with check (bucket_id = 'restaurant-photos' and auth.role() = 'authenticated');
create policy "authenticated delete restaurant photos" on storage.objects
  for delete using (bucket_id = 'restaurant-photos' and auth.role() = 'authenticated');
