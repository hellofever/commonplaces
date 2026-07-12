-- Restaurant categories: single source of truth is lib/categories.ts on the app side;
-- this enum must stay in sync with the CATEGORIES list there.
create type restaurant_category as enum (
  'italian',
  'cafe',
  'asian',
  'bar',
  'fine_dining',
  'casual'
);

create table restaurants (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  category        restaurant_category not null,
  lat             double precision not null,
  lng             double precision not null,
  address         text not null,
  phone           text,
  website         text,
  price_level     smallint check (price_level between 1 and 4),
  opening_hours   jsonb,
  google_place_id text unique,
  notes           text,
  photo_url       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index restaurants_geo_idx on restaurants (lat, lng);
create index restaurants_category_idx on restaurants (category);

-- keep updated_at current on every edit (spreadsheet inline edits, form saves, etc.)
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger restaurants_set_updated_at
  before update on restaurants
  for each row
  execute function set_updated_at();

alter table restaurants enable row level security;

-- Small trusted group behind email/password auth: every signed-in account
-- can read and write every row. No per-row ownership -- this is a shared list,
-- not a multi-tenant product.
create policy "authenticated read" on restaurants
  for select
  using (auth.role() = 'authenticated');

create policy "authenticated write" on restaurants
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
