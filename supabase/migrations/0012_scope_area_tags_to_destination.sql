-- Area and Tags (cuisine) become destination-scoped taxonomies: each destination gets
-- its own set of area/tag values (switching destination only ever shows/creates within
-- that destination's own list). Type stays one taxonomy shared by every destination --
-- it's still the facet that drives primary_tag_id/pin color everywhere, so it needs to
-- mean the same thing regardless of which destination you're looking at.
--
-- Before this, tags/restaurant_tags had no destination concept at all -- every kind was
-- 100% global. This migration must not lose any existing restaurant's area/tags
-- assignments, and must never touch the restaurants table itself (pins/locations/types
-- are completely unaffected -- see the order of operations below).

alter table tags add column destination_id uuid references destinations(id) on delete cascade;

-- Drop the old global uniqueness rule before inserting per-destination copies below --
-- the new rows below intentionally share (kind, name) with an existing global row
-- (differing only by destination_id), which the old constraint would reject.
alter table tags drop constraint tags_kind_name_key;

-- Explode each existing area/tags row into one copy per destination it's actually used
-- in today -- a name may currently span more than one destination, since these were
-- global until now. `distinct` guards against inserting the same (kind, name,
-- destination) combo twice when more than one restaurant_tags row would produce it.
insert into tags (kind, name, color, icon, destination_id)
select distinct t.kind, t.name, t.color, t.icon, r.destination_id
from tags t
join restaurant_tags rt on rt.tag_id = t.id
join restaurants r on r.id = rt.restaurant_id
where t.kind in ('tags', 'area');

-- Repoint every restaurant_tags row from the old global area/tags tag to the new
-- per-destination copy matching that row's own restaurant's destination. Must run
-- before the delete below -- restaurant_tags.tag_id cascades on tag delete, so deleting
-- the old rows first would silently strip every restaurant's area/tags assignments.
update restaurant_tags rt
set tag_id = new_t.id
from tags old_t
join tags new_t
  on new_t.kind = old_t.kind
  and new_t.name = old_t.name
where rt.tag_id = old_t.id
  and old_t.kind in ('tags', 'area')
  and old_t.destination_id is null
  and new_t.destination_id = (select r.destination_id from restaurants r where r.id = rt.restaurant_id);

-- Drop the now-unreferenced old global area/tags rows. This also removes any area/tags
-- value that was defined (e.g. via Settings) but never applied to any restaurant --
-- there's no restaurant to infer a destination for those, and nothing observable is
-- lost since no restaurant/pin ever pointed at them.
delete from tags where kind in ('tags', 'area') and destination_id is null;

alter table tags add constraint tags_destination_scope_chk
  check ((kind = 'type') = (destination_id is null));

-- Two scopes, two partial unique indexes: type names stay unique app-wide, area/tags
-- names are only unique within their own destination.
create unique index tags_type_name_uidx on tags (name) where kind = 'type';
create unique index tags_scoped_name_uidx on tags (kind, name, destination_id) where kind in ('tags', 'area');

create index tags_destination_idx on tags (destination_id);
