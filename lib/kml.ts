import { formatPriceLevel } from "./sheetSort";
import type { Restaurant } from "./types";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function restaurantToPlacemark(r: Restaurant & { lat: number; lng: number }): string {
  const description = [
    [...r.types, ...r.tags].map((t) => t.name).join(", "),
    r.areas.map((a) => a.name).join(", "),
    r.address,
    r.phone,
    formatPriceLevel(r.price_level),
    r.notes,
  ]
    .filter((line): line is string => !!line)
    .map(escapeXml)
    .join("<br>");

  return [
    "  <Placemark>",
    `    <name>${escapeXml(r.name)}</name>`,
    `    <description>${description}</description>`,
    "    <Point>",
    `      <coordinates>${r.lng},${r.lat},0</coordinates>`,
    "    </Point>",
    "  </Placemark>",
  ].join("\n");
}

// Rows without coordinates can't become a KML Point, so they're dropped from
// the export rather than emitted with bogus/zero coordinates.
export function restaurantsToKml(restaurants: Restaurant[]): string {
  const placemarks = restaurants
    .filter((r): r is Restaurant & { lat: number; lng: number } => r.lat != null && r.lng != null)
    .map(restaurantToPlacemark)
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    "<Document>",
    "  <name>Commonplaces</name>",
    placemarks,
    "</Document>",
    "</kml>",
  ].join("\n");
}

export function downloadKml(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/vnd.google-earth.kml+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
