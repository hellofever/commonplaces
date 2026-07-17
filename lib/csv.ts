import { formatPriceLevel } from "./sheetSort";
import type { Restaurant } from "./types";

const CSV_HEADERS = ["Fav", "Name", "Tags", "Area", "City", "Address", "Phone", "Price", "Notes"];

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function restaurantToRow(r: Restaurant): string[] {
  return [
    r.is_favourite ? "Yes" : "No",
    r.name,
    r.tags.map((t) => t.name).join(", "),
    r.areas.map((a) => a.name).join(", "),
    r.city?.name ?? "",
    r.address,
    r.phone ?? "",
    formatPriceLevel(r.price_level),
    r.notes ?? "",
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
