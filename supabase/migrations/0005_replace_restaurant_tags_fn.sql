-- Atomic full-replace of a restaurant's tag/area/city join rows. The app previously
-- did delete-then-insert as two client round trips, so a failure after the delete
-- left the restaurant silently stripped of all its tags. A SQL function runs both
-- statements in one transaction. SECURITY INVOKER keeps RLS enforcement on
-- restaurant_tags exactly as if the caller ran the statements directly.
create or replace function replace_restaurant_tags(p_restaurant_id uuid, p_tag_ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  delete from restaurant_tags where restaurant_id = p_restaurant_id;
  insert into restaurant_tags (restaurant_id, tag_id)
    select p_restaurant_id, t from unnest(p_tag_ids) as t;
$$;
