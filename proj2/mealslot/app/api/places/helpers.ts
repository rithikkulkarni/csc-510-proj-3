import "server-only";

const GOOGLE_KEY = process.env.MAPS_API_KEY;
if (!GOOGLE_KEY) {
    // keep quiet in production but let tests warn
    console.warn("Missing MAPS_API_KEY environment variable");
}

export function toPriceStr(price_level: number | undefined | null) {
    if (typeof price_level !== "number") return undefined;
    return "$".repeat(Math.max(1, Math.min(4, Math.round(price_level))));
}

export function haversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
}

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

export async function placesTextSearch(query: string, pageSize = 2) {
    if (!GOOGLE_KEY) return { results: [], error: "missing_key" };
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query
    )}&type=restaurant&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return { results: [], error: `http_${res.status}` };
    const body = await res.json();
    const results = Array.isArray(body.results) ? body.results.slice(0, pageSize) : [];
    return { results, error: null };
}
