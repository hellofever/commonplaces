import { formatPriceLevel } from "./sheetSort";
import type { Restaurant } from "./types";

const CSV_HEADERS = [
  "Fav",
  "Name",
  "Type",
  "Tags",
  "Area",
  "Address",
  "Phone",
  "Price",
  "Notes",
  "Added",
];

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function restaurantToRow(r: Restaurant): string[] {
  return [
    r.is_favourite ? "Yes" : "No",
    r.name,
    r.types.map((t) => t.name).join(", "),
    r.tags.map((t) => t.name).join(", "),
    r.areas.map((a) => a.name).join(", "),
    r.address ?? "",
    r.phone ?? "",
    formatPriceLevel(r.price_level),
    r.notes ?? "",
    new Date(r.created_at).toLocaleDateString(),
  ];
}

export function restaurantsToCsv(restaurants: Restaurant[]): string {
  const rows = [CSV_HEADERS, ...restaurants.map(restaurantToRow)];
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
