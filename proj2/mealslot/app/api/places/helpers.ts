import "server-only";

const GOOGLE_KEY = process.env.MAPS_API_KEY;
if (!GOOGLE_KEY) {
  // Keep quiet in production but surface a warning in dev/test environments
  console.warn("Missing MAPS_API_KEY environment variable");
}

/**
 * Convert a Google Places price_level into a human-readable string.
 * - Maps numeric levels to "$" through "$$$$".
 * - Returns undefined if the input is missing or invalid.
 */
export function toPriceStr(price_level: number | undefined | null) {
  if (typeof price_level !== "number") return undefined;
  return "$".repeat(Math.max(1, Math.min(4, Math.round(price_level))));
}

/**
 * Compute the great-circle distance between two coordinates.
 * Uses the Haversine formula and returns distance in kilometers,
 * rounded to one decimal place.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in kilometers

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Resolve a city name to latitude/longitude using Google Geocoding API.
 * Returns null if the API key is missing or if the request fails.
 */
export async function geocodeCity(city: string) {
  if (!GOOGLE_KEY) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    city
  )}&key=${GOOGLE_KEY}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const body = await res.json();
  const loc = body.results?.[0]?.geometry?.location;
  if (!loc) return null;

  return { lat: loc.lat, lng: loc.lng };
}

/**
 * Perform a Google Places text search for restaurants.
 * - Limits results to a configurable page size.
 * - Returns an empty result set with an error code on failure.
 */
export async function placesTextSearch(query: string, pageSize = 2) {
  if (!GOOGLE_KEY) return { results: [], error: "missing_key" };

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query
  )}&type=restaurant&key=${GOOGLE_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    return { results: [], error: `http_${res.status}` };
  }

  const body = await res.json();
  const results = Array.isArray(body.results)
    ? body.results.slice(0, pageSize)
    : [];

  return { results, error: null };
}
