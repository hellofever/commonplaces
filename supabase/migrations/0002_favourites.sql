-- "Add to favourites" toggle, surfaced in List/Sheet views. Set independently of the
-- main edit form (see lib/restaurants.ts setFavourite) so saving the form never
-- clobbers it.
alter table restaurants
  add column is_favourite boolean not null default false;

create index restaurants_is_favourite_idx on restaurants (is_favourite);
