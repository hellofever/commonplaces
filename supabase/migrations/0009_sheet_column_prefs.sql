-- Per-account Sheet column layout (order, hidden columns, widths). Unlike every other
-- table in this app, this one *is* per-row-owned -- it's personal UI preference, not
-- shared list data, so it's scoped to auth.uid() rather than the usual
-- "any authenticated user can read/write everything" policy (see 0001_init.sql).
create table sheet_column_prefs (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  column_order   text[] not null,
  hidden_columns text[] not null default '{}',
  column_widths  jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

create trigger sheet_column_prefs_set_updated_at
  before update on sheet_column_prefs
  for each row
  execute function set_updated_at(); -- reuses the trigger fn from 0001_init.sql

alter table sheet_column_prefs enable row level security;

create policy "own prefs" on sheet_column_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
