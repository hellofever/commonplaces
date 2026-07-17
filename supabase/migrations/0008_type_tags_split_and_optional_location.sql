-- Split the old single 'tag' facet into two: 'type' (renamed in place, still the
-- colored/iconed facet that drives primary_tag_id/pin color -- app now caps it at 3
-- selections and requires at least 1) and 'tags' (new, freeform cuisine/food-type
-- labels, no seed data/no preset, no color or icon -- plain pills like area). Existing
-- kind='tag' rows (Bakery, Cafe, etc.) become kind='type' automatically, no data
-- migration needed. Area also becomes mandatory in the app (still enforced there, not
-- here -- see the primary_tag_id comment in 0001_init.sql for why cardinality rules
-- live in the app rather than the schema).
alter type tag_kind rename value 'tag' to 'type';
alter type tag_kind add value 'tags';

-- Location (address + coordinates) is now fully optional -- a restaurant can be saved
-- with just a name/type/area and no location; it just won't get a map pin until one is
-- set (still shows in List/Sheet either way).
alter table restaurants alter column lat drop not null;
alter table restaurants alter column lng drop not null;
alter table restaurants alter column address drop not null;
