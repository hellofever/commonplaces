export type RestaurantCategory =
  | "italian"
  | "cafe"
  | "asian"
  | "bar"
  | "fine_dining"
  | "casual";

export const CATEGORIES: { value: RestaurantCategory; label: string; color: string }[] = [
  { value: "italian", label: "Italian", color: "#3d6e63" },
  { value: "cafe", label: "Café", color: "#b6892c" },
  { value: "asian", label: "Asian", color: "#7a4a6b" },
  { value: "bar", label: "Bar", color: "#4c5f8a" },
  { value: "fine_dining", label: "Fine dining", color: "#9c3f34" },
  { value: "casual", label: "Casual", color: "#5f7a3d" },
];

export function categoryColor(category: RestaurantCategory): string {
  return CATEGORIES.find((c) => c.value === category)?.color ?? "#5c6355";
}

export function categoryLabel(category: RestaurantCategory): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

// Best-effort mapping from Google Places' `primaryType` to our own category.
// Always offered as an editable suggestion (see AddRestaurantFlow) -- never applied silently,
// since Places' taxonomy will never line up perfectly with ours.
const PLACE_TYPE_TO_CATEGORY: Record<string, RestaurantCategory> = {
  italian_restaurant: "italian",
  pizza_restaurant: "italian",
  cafe: "cafe",
  coffee_shop: "cafe",
  bakery: "cafe",
  japanese_restaurant: "asian",
  chinese_restaurant: "asian",
  thai_restaurant: "asian",
  vietnamese_restaurant: "asian",
  sushi_restaurant: "asian",
  korean_restaurant: "asian",
  asian_restaurant: "asian",
  bar: "bar",
  wine_bar: "bar",
  pub: "bar",
  fine_dining_restaurant: "fine_dining",
};

export function suggestCategory(primaryType: string | null): RestaurantCategory {
  if (primaryType && PLACE_TYPE_TO_CATEGORY[primaryType]) {
    return PLACE_TYPE_TO_CATEGORY[primaryType];
  }
  return "casual";
}
