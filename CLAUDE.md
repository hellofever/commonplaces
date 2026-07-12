@AGENTS.md

# Our Places

A shared map of favourite restaurants for a small group (<5 people). Tap a pin for
details, browse as a list, or maintain everything in a spreadsheet-style grid. Add a
restaurant by searching Google Places (autofills address/phone/hours) or entering it
manually.

## Tech Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind v4**, no `src/` dir. Deployed to Vercel.
- **Supabase** (Postgres + Auth + RLS) — the only write path, no Google Sheets
  integration. A spreadsheet-*feel* is provided by the in-app Sheet view instead (see
  UI structure, below), which stays schema-safe because it's still backed by RLS.
- **Google Maps JavaScript API** (`@vis.gl/react-google-maps`) renders the map — chosen
  over MapLibre/free tiles because it shares one API family with Places search, at
  negligible cost for <5 users (see Cost, below).
- **Google Places API (New)** — Text Search + Place Details — powers "search to add."
  Called only from server routes (`app/api/places/*/route.ts`), never from the browser,
  so the Places key never ships to the client.
- **Auth:** Supabase email/password, tied to the owner's personal email. No magic link,
  no separate login route — `AppShell` shows `LoginForm` inline when there's no session.

## Project Structure

- `app/` — routes: `page.tsx` (Map), `list/`, `sheet/`, `api/places/{search,details}/`
  (server-only Places proxy). No `src/` dir.
- `components/` — `AppShell` (auth gate + shared `RestaurantUIContext`), `MapView`,
  `AddRestaurantFlow` + `RestaurantForm` + `TagPicker` (shared add/edit flow),
  `RestaurantDetailView`, `LoginForm`, `BottomSheet`, `Header`.
- `lib/` — `supabase.ts` (client), `restaurants.ts` (fetch/insert/update, tag-join
  normalization), `tags.ts` (tags/area/city taxonomy + palette), `types.ts`.
- `supabase/migrations/` — one file so far, `0001_init.sql`. This *is* the schema source
  of truth — see "What to avoid" for the workflow around it.

## Data model

`supabase/migrations/0001_init.sql`, RLS-gated to `auth.role() = 'authenticated'`
throughout (no per-row ownership; it's a shared list, not multi-tenant).

A unified `tags` table (`kind`: `'tag' | 'area' | 'city'`) plus a `restaurant_tags`
many-to-many join, superseding an earlier single `category` enum:

- **Tags** (Bakery, Cafe, Casual Eats, Restaurants, Dessert — seeded starting set) and
  **Area** (Inner West, City, Inner City, East, West, South, North, Regional — seeded) are
  both many-to-many with restaurants via `restaurant_tags`. Both are user-creatable from
  the add/edit form, not a fixed list — the seed rows are just a starting point.
- **City** (Sydney — seeded) uses the same table/join mechanism, but the app only ever
  lets you pick one per restaurant (single-select in the UI; nothing stops multiple at the
  DB level, it's just not offered).
- `restaurants.primary_tag_id` is a separate FK (not part of the join) that drives the map
  pin color — you designate one of a restaurant's tags as primary when saving. Tags get
  their color auto-assigned from a rotating palette when created.
- `google_place_id` (unique on `restaurants`) powers duplicate detection when adding a
  restaurant that's already on the list.

## Why Supabase, not Google Sheets

Sheets has no schema enforcement, no real auth model (anyone with the edit link can
change anything), no geospatial query support, and silent-overwrite risk on concurrent
edits. Supabase gives real constraints, RLS-scoped access, and PostGIS-ready geo indexing,
for the same $0 cost at this scale.

## Cost

Google Maps Platform's Essentials tier (Maps JS SDK, Places Autocomplete/Details) is free
up to ~10,000 calls/API/month. At <5 users this should stay $0/month. Still requires a
billing account on file — set a small budget alert and restrict both API keys (HTTP
referrer for the Maps key, API restriction only for the server-only Places key).

## UI structure

Three views behind one segmented control (Map / List / Sheet), one shared search bar
(persisted via the `?q=` URL param so it survives navigation), one global "+ Add" button.
Wireframe: https://claude.ai/code/artifact/b78f30b8-062e-4169-b6c4-0352a6ff8691

- **Map** (`app/page.tsx`) — pins colored by `primary_tag_id`'s tag color; tap opens the
  detail sheet. Clustering (`@googlemaps/markerclusterer`, already installed) is deferred
  until the list is actually large enough to need it — not wired up yet.
- **List** (`app/list/page.tsx`) — name + tags/area meta, browsing-oriented.
- **Sheet** (`app/sheet/page.tsx`) — denser table (tags/area/city/phone/price/notes
  columns). Row click currently opens the same shared edit form as everywhere else,
  rather than true inline cell editing — deliberate simplification for this first pass;
  true per-cell inline editing (desktop-only affordance) is a fast-follow.
- **Add/Edit** (`components/AddRestaurantFlow.tsx` + `RestaurantForm` +
  `TagPicker`) — one shared flow/form for search-to-autofill, "add manually," and editing.
  `TagPicker` handles tags (multi), area (multi), and city (single) with inline
  "create new" — all three are freeform lists seeded with a starting set, not fixed
  enums. A restaurant's primary tag (colors its pin) is chosen among its selected tags,
  auto-picked when there's only one. Places' `primaryType` only *prefills the tag search
  box* with a suggested name (`suggestTagName` in `lib/tags.ts`) — it never selects or
  creates a tag on its own. Duplicate detection matches on `google_place_id` before the
  form ever opens.

All three views + the add/edit sheet share one `RestaurantUIContext`
(`components/AppShell.tsx`), which also owns the auth gate and the refresh-after-save
signal each page's data fetch listens for.

## Known simplifications (intentional, not bugs)

- No structured opening-hours editor yet — Places autofill populates it, manual entry
  leaves it null. A proper per-day hours editor is a fast-follow.
- No image handling for `photo_url` yet (schema column exists, unused in UI).
- Sheet view's inline cell editing is deferred (see above).
- Auth check is client-side only (no `@supabase/ssr` middleware/proxy setup) — acceptable
  because the real security boundary is Postgres RLS, not the client gate. Worth adding
  proper SSR session handling later for a cleaner logged-out experience.
- Node locally is v20.14; Supabase's JS packages prefer v22+ (warning only, not blocking).
  Worth upgrading Node at some point.

## Coding conventions

- No code comments unless they explain a non-obvious *why* (a workaround, a subtle
  invariant) — see e.g. the `primary_tag_id` and palette-rotation comments in
  `lib/tags.ts`/the migration. Don't add comments that just restate what the code does.
  Well-named identifiers already do that.
- Tailwind utility-first throughout, always pairing light/dark variants (`dark:` classes)
  rather than a separate theme stylesheet.
- Shared cross-page state (auth session, open sheet, refresh signal) goes through
  `RestaurantUIContext` in `AppShell`, not prop-drilling or a separate state library.
- Supabase reads/writes go through `lib/*.ts` helper functions (`fetchRestaurants`,
  `createTag`, etc.) — components don't call the Supabase client directly.

## What Claude should know

- This is **not** the Next.js you know from training data — read `@AGENTS.md` and the
  docs it points to before assuming an API/convention.
- The real security boundary is Postgres RLS, not the client-side auth gate in
  `AppShell` — don't "fix" the client-only auth check without discussing it first, it's
  a deliberate simplification (see Known simplifications).
- `@vis.gl/react-google-maps`'s `<Map>` component silently drops its own default
  `width:100%; height:100%` styling the moment you pass it a `className` — if the map
  ever goes blank/zero-height again, check the height chain (`html`/`body`/`main` all
  need a *definite* height, not just `min-height`) before assuming it's a JS crash.
- Always ask before deleting anything non-trivial (files, DB rows, migrations).
- Prefer simple, boring solutions over clever ones — this is a small app for <5 people,
  not a platform.

## What to avoid

- Don't install new packages without asking first.
- Don't run ad-hoc schema changes against Supabase directly (SQL editor, one-off
  `ALTER TABLE`s) — every schema change goes into a new `supabase/migrations/NNNN_*.sql`
  file so the migration history stays the source of truth.
- Never touch, print, or commit `.env*` files (all git-ignored except `.env*.example`,
  which must only ever contain empty placeholders — see `.env.local.example`).

## Github workflow

- Never commit or push automatically — only on explicit instruction, each time.
- Before pushing: check the diff for bugs and security risks (leaked secrets, RLS gaps,
  server-only keys accidentally reachable from client code) — see the review pass done
  before the tags/area/city commit as the template for this.
- When committing, summarize what changed and why in the commit message, not just what
  files touched.

## Setup checklist

1. Copy `.env.local.example` to `.env.local` and fill in Supabase + Google keys.
2. Run `supabase/migrations/0001_init.sql` against the Supabase project (SQL editor or
   Supabase CLI).
3. In Google Cloud Console: enable Maps JavaScript API + Places API (New), create a Map ID
   for Advanced Markers, restrict the two keys as described in `.env.local.example`.
4. Sign up once from the in-app login form (email/password) — that's the only account
   flow, no invite system.
