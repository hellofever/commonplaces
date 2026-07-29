// Widest circle Google's Places API accepts for locationBias -- also reused as the
// "am I even near this destination" radius for the map's locate-me button (see
// MapView.tsx), so the two stay in sync without duplicating the number.
export const DESTINATION_BIAS_RADIUS_METERS = 50000;

const EARTH_RADIUS_METERS = 6371000;

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}
