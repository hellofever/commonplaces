// Design-token source of truth for the "type" tag palette: 9 hues, 5 shades each
// (100/300/500/700/900), anchored on 500 as the root color a hue is chosen by. A tag
// stores one of TYPE_HUES (see lib/tags.ts) and every render site resolves that single
// hue to a *different* shade depending on context:
//   - map pin            -> 500, same in light/dark (mapColorVar)
//   - tag pill background -> 700 in light, 300 in dark, for contrast against the pill's
//     white text (tagColorVar, via CSS vars defined in app/globals.css so components
//     don't need to read the theme in JS)
//   - Settings picker      -> 500 swatch, used to *choose* a tag's hue (swatchColor)
export const TYPE_PALETTE = {
  pink: { 100: "#f3cee0", 300: "#e898c0", 500: "#e05299", 700: "#b01763", 900: "#620936" },
  red: { 100: "#fac1c8", 300: "#fa7c8a", 500: "#ff2139", 700: "#bb0014", 900: "#65000b" },
  amber: { 100: "#f9ddb8", 300: "#f9ba68", 500: "#ff9000", 700: "#a65e00", 900: "#593200" },
  yellow: { 100: "#faebc3", 300: "#fad97f", 500: "#ffc527", 700: "#bf8c00", 900: "#674b00" },
  green: { 100: "#dbead2", 300: "#b4d6a1", 500: "#84c062", 700: "#528b32", 900: "#2c4d19" },
  teal: { 100: "#a1f7e6", 300: "#72d8c3", 500: "#00ad89", 700: "#007059", 900: "#003d30" },
  cyan: { 100: "#bae5e3", 300: "#6dcdca", 500: "#2d928f", 700: "#1a6260", 900: "#0c3735" },
  blue: { 100: "#a0daf7", 300: "#34b6f7", 500: "#006fa6", 700: "#00486c", 900: "#00273a" },
  purple: { 100: "#cec9e1", 300: "#988fc4", 500: "#5b4d9a", 700: "#3a3067", 900: "#1e1839" },
} as const;

export const TYPE_HUES = Object.keys(TYPE_PALETTE) as TypeHue[];

export type TypeHue = keyof typeof TYPE_PALETTE;

export function isTypeHue(value: string | null | undefined): value is TypeHue {
  return !!value && value in TYPE_PALETTE;
}

export function mapColorVar(hue: TypeHue): string {
  return `var(--type-${hue}-map)`;
}

export function tagColorVar(hue: TypeHue): string {
  return `var(--type-${hue}-tag)`;
}

export function swatchColor(hue: TypeHue): string {
  return TYPE_PALETTE[hue][500];
}
