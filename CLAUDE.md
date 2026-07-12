@AGENTS.md

# Our Places — decisions log

A shared map of favourite restaurants for a small group (<5 people). Tap a pin for details,
browse as a list, or maintain everything in a spreadsheet-style grid. Add a restaurant by
searching Google Places (autofills address/phone/hours) or entering it manually.

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind v4**, no `src/` dir. Deployed to Vercel.
- **Supabase** (Postgres + Auth + RLS) is the database. It is the only write path — no
  Google Sheets integration. A spreadsheet-*feel* is provided by the in-app Sheet view
  instead (see below), which stays schema-safe because it's still backed by RLS.
- **Google Maps JavaScript API** (`@vis.gl/react-google-maps`) renders the map — chosen
  over MapLibre/free tiles because it shares one API family with Places search, at
  negligible cost for <5 users (see Cost, below).
- **Google Places API (New)** — Text Search + Place Details — powers "search to add."
  Called only from server routes (`app/api/places/*/route.ts`), never from the browser,
  so the Places key never ships to the client.
- **Auth:** Supabase email/password, tied to the owner's personal email. No magic link,
  no separate login route — `AppShell` shows `LoginForm` inline when there's no session.

## Data model

`supabase/migrations/0001_init.sql` — one `restaurants` table, RLS-gated to
`auth.role() = 'authenticated'` (no per-row ownership; it's a shared list, not
multi-tenant). Key fields: `category` (enum, mirrored in `lib/categories.ts` — that file
is the single source of truth for category labels/colors, keep both in sync manually),
`lat`/`lng`, `google_place_id` (unique — this is what powers duplicate detection when
adding a restaurant that's already on the list).

## Why Supabase, not Google Sheets

Sheets has no schema enforcement, no real auth model (anyone with the edit link can
change anything), no geospatial query support, and silent-overwrite risk on concurrent
edits. Supabase gives real constraints, RLS-scoped access, and PostGIS-ready geo indexing,
for the same $0 cost at this scale. The Sheet *view* in the app is what actually satisfies
the "maintain it like a spreadsheet" instinct — see UI below.

## Cost

Google Maps Platform's Essentials tier (Maps JS SDK, Places Autocomplete/Details) is free
up to ~10,000 calls/API/month. At <5 users this should stay $0/month. Still requires a
billing account on file — set a small budget alert and restrict both API keys (HTTP
referrer for the Maps key, API restriction only for the server-only Places key).

## UI structure

Three views behind one segmented control (Map / List / Sheet), one shared search bar
(persisted via the `?q=` URL param so it survives navigation), one global "+ Add" button.
Wireframe: https://claude.ai/code/artifact/b78f30b8-062e-4169-b6c4-0352a6ff8691

- **Map** (`app/page.tsx`) — pins colored by category; tap opens the detail sheet.
  Clustering (`@googlemaps/markerclusterer`, already installed) is deferred until the
  list is actually large enough to need it — not wired up yet.
- **List** (`app/list/page.tsx`) — name + neighborhood-level meta, browsing-oriented.
- **Sheet** (`app/sheet/page.tsx`) — denser table (category/phone/price/notes columns).
  Row click currently opens the same shared edit form as everywhere else, rather than
  true inline cell editing — that's a deliberate simplification for this first pass, not
  an oversight; true per-cell inline editing (desktop-only affordance) is a fast-follow.
- **Add/Edit** (`components/AddRestaurantFlow.tsx`) — one shared flow and one shared
  `RestaurantForm`, used for: search-to-autofill, "add manually," and editing an existing
  entry. Category is auto-suggested from Places' `primaryType` but always stays editable —
  never applied silently. Duplicate detection matches on `google_place_id` before the form
  ever opens.

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

## Setup checklist

1. Copy `.env.local.example` to `.env.local` and fill in Supabase + Google keys.
2. Run `supabase/migrations/0001_init.sql` against the Supabase project (SQL editor or
   Supabase CLI).
3. In Google Cloud Console: enable Maps JavaScript API + Places API (New), create a Map ID
   for Advanced Markers, restrict the two keys as described in `.env.local.example`.
4. Sign up once from the in-app login form (email/password) — that's the only account
   flow, no invite system.
