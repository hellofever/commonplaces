-- Move tags.color from a raw hex string to one of 9 fixed hue keys (see
-- lib/colorTokens.ts's TYPE_PALETTE), so a single stored value can resolve to 3
-- different shades depending on where it renders (map pin 500, tag pill 300/700
-- light/dark) via CSS custom properties in app/globals.css, instead of the old
-- one-hex-fits-all-contexts scheme.

-- Old 12-value TAG_PALETTE (lib/tags.ts, pre-token-system) mapped by nearest hue.
update tags set color = 'teal'   where kind = 'type' and color = '#3d6e63'; -- teal
update tags set color = 'amber'  where kind = 'type' and color = '#b6892c'; -- ochre
update tags set color = 'purple' where kind = 'type' and color = '#7a4a6b'; -- plum
update tags set color = 'blue'   where kind = 'type' and color = '#4c5f8a'; -- dusty blue
update tags set color = 'red'    where kind = 'type' and color = '#9c3f34'; -- brick
update tags set color = 'green'  where kind = 'type' and color = '#5f7a3d'; -- moss
update tags set color = 'amber'  where kind = 'type' and color = '#8a6a4c'; -- coffee
update tags set color = 'cyan'   where kind = 'type' and color = '#4a7a8a'; -- slate teal
update tags set color = 'pink'   where kind = 'type' and color = '#8a4a5f'; -- wine
update tags set color = 'green'  where kind = 'type' and color = '#6b6b3d'; -- olive
update tags set color = 'purple' where kind = 'type' and color = '#5a4a8a'; -- indigo
update tags set color = 'teal'   where kind = 'type' and color = '#3d5f4c'; -- pine

-- Safety net for any color value that wasn't one of the 12 above (shouldn't happen --
-- the app only ever wrote TAG_PALETTE hex values -- but avoids the CHECK below failing
-- on stray data).
update tags
  set color = 'pink'
  where kind = 'type'
    and color is not null
    and color not in ('pink', 'red', 'amber', 'yellow', 'green', 'teal', 'cyan', 'blue', 'purple');

alter table tags add constraint tags_color_is_type_hue
  check (color is null or color in ('pink', 'red', 'amber', 'yellow', 'green', 'teal', 'cyan', 'blue', 'purple'));
