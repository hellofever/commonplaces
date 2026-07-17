-- Destinations replace the 'city' tag facet: a destination is a workspace-level scope
-- (a country or city, e.g. "Sydney, Australia" or "Mexico"), not a per-restaurant label.
-- Every restaurant belongs to exactly one destination; the app only ever shows/lets you
-- add restaurants within the currently active one. Unlike tags/area, a destination needs
-- its own fields (Google place id for creation-time validation, lat/lng so the map can
-- recenter on switch), so it gets a dedicated table rather than another tags.kind.
create table destinations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  google_place_id text unique,
  lat             double precision,
  lng             double precision,
  created_at      timestamptz not null default now()
);

alter table destinations enable row level security;

create policy "authenticated read" on destinations
  for select using (auth.role() = 'authenticated');
create policy "authenticated write" on destinations
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter publication supabase_realtime add table destinations;

-- Seed the original destination from the app's existing (until now hardcoded) Sydney
-- coordinates, then backfill every existing restaurant onto it before making the column
-- mandatory -- there's no ambiguity here, every restaurant added so far is a Sydney one.
insert into destinations (name, lat, lng) values ('Sydney, Australia', -33.8688, 151.2093);

alter table restaurants add column destination_id uuid references destinations(id);

update restaurants
set destination_id = (select id from destinations where name = 'Sydney, Australia')
where destination_id is null;

alter table restaurants alter column destination_id set not null;

create index restaurants_destination_idx on restaurants (destination_id);

-- Drop the 'city' facet entirely -- superseded by destinations above.
delete from restaurant_tags where tag_id in (select id from tags where kind = 'city');
delete from tags where kind = 'city';

-- Postgres has no ALTER TYPE ... DROP VALUE -- same rename-swap technique 0008 used for
-- 'tag' -> 'type'.
alter type tag_kind rename to tag_kind_old;
create type tag_kind as enum ('type', 'tags', 'area');
alter table tags alter column kind type tag_kind using kind::text::tag_kind;
drop type tag_kind_old;
