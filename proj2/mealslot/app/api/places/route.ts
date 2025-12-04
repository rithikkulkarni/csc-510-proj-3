import "server-only";
import { NextRequest } from "next/server";
import { z } from "zod";

const Body = z.object({
  cuisines: z.array(z.string().min(1)).min(1),
  locationHint: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

// Normalize the key: treat missing, empty, or "dummy" as "no real key"
const RAW_KEY = process.env.MAPS_API_KEY;
const GOOGLE_KEY =
  RAW_KEY && RAW_KEY.toLowerCase() !== "dummy" ? RAW_KEY : undefined;

if (!GOOGLE_KEY) {
  console.warn(
    "MAPS_API_KEY is missing or set to 'dummy' — using stubbed venues instead of real Places API."
  );
}

function toPriceStr(price_level: number | undefined | null) {
  if (typeof price_level !== "number") return undefined;
  return "$".repeat(Math.max(1, Math.min(4, Math.round(price_level))));
}

function haversineDistanceKm(
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

async function geocodeCity(city: string) {
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

async function placesTextSearch(query: string, pageSize = 2) {
  if (!GOOGLE_KEY) return { results: [], error: "missing_key" };
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query
  )}&type=restaurant&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return { results: [], error: `http_${res.status}` };
  const body = await res.json();
  const results = Array.isArray(body.results)
    ? body.results.slice(0, pageSize)
    : [];
  return { results, error: null };
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { code: "BAD_REQUEST", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { cuisines, locationHint, lat, lng } = parsed.data;
  const city = (locationHint ?? "Your City").replace(/[^a-zA-Z\s]/g, "");

  const responseObj: {
    results: Record<string, Array<Record<string, any>>>;
    errors: Array<{ cuisine: string; message: string }>;
    notice?: string;
  } = { results: {}, errors: [] };

  // Determine origin: prefer user lat/lng
  let origin: { lat: number; lng: number } | null = null;
  if (typeof lat === "number" && typeof lng === "number") {
    origin = { lat, lng };
  } else if (GOOGLE_KEY) {
    try {
      origin = await geocodeCity(city);
      if (!origin)
        responseObj.notice = "Could not geocode location; distance omitted.";
    } catch (e) {
      responseObj.notice = "Error geocoding location; distance omitted.";
    }
  } else {
    responseObj.notice =
      "MAPS_API_KEY not set (or set to 'dummy') — using stubbed venues with approximate location.";
  }

  // If we DON'T have a real API key, return stubbed venues
  if (!GOOGLE_KEY) {
    // Rough default for "Denver" if no coords were provided
    const baseLat = origin?.lat ?? 39.7392;
    const baseLng = origin?.lng ?? -104.9903;

    const stubResults = cuisines.reduce(
      (acc, cuisine, cuisineIdx) => {
        const venues = [1, 2].map((i) => {
          const offsetLat = baseLat + 0.01 * (cuisineIdx * 2 + i);
          const offsetLng = baseLng + 0.01 * i;
          const distance_km =
            origin && typeof origin.lat === "number" && typeof origin.lng === "number"
              ? haversineDistanceKm(origin.lat, origin.lng, offsetLat, offsetLng)
              : undefined;

          return {
            id: `stub_${cuisine}_${i}`,
            name: `${cuisine} Spot ${i}`,
            addr: `${city} · Stubbed address ${i}`,
            rating: 4.2 - 0.1 * i,
            price: i === 1 ? "$$" : "$$$",
            url: "https://maps.google.com",
            cuisine,
            distance_km,
            lat: offsetLat,
            lng: offsetLng,
          };
        });

        acc[cuisine] = venues;
        return acc;
      },
      {} as Record<string, Array<Record<string, any>>>
    );

    return Response.json({
      results: stubResults,
      errors: [],
      notice:
        responseObj.notice ??
        "MAPS_API_KEY not set (or set to 'dummy') — returning stubbed venues.",
    });
  }

  // If we DO have a real API key, hit the Places API as before
  const jobs = cuisines.map(async (dish) => {
    const query = `${dish} restaurant in ${city}`;
    try {
      const { results, error } = await placesTextSearch(query, 2);
      if (error) {
        responseObj.errors.push({ cuisine: dish, message: String(error) });
        responseObj.results[dish] = [];
        return;
      }

      const mapped = results.map((r: any, i: number) => {
        const place_id: string = r.place_id;
        const name: string = r.name;
        const addr: string | undefined =
          r.formatted_address ?? r.vicinity;
        const rating: number | undefined =
          typeof r.rating === "number" ? r.rating : undefined;
        const price = toPriceStr(r.price_level);
        const plat = r.geometry?.location?.lat;
        const plng = r.geometry?.location?.lng;
        const distance_km =
          origin &&
          typeof plat === "number" &&
          typeof plng === "number"
            ? haversineDistanceKm(origin.lat, origin.lng, plat, plng)
            : undefined;
        const url = place_id
          ? `https://www.google.com/maps/place/?q=place_id:${place_id}`
          : undefined;

        return {
          id: `g_${place_id ?? `${dish}_${i}`}`,
          name,
          addr,
          rating,
          price,
          url,
          cuisine: dish,
          distance_km,
          lat: plat,
          lng: plng,
        };
      });

      responseObj.results[dish] = mapped;
    } catch (err: any) {
      responseObj.errors.push({
        cuisine: dish,
        message: err?.message ?? String(err),
      });
      responseObj.results[dish] = [];
    }
  });

  await Promise.all(jobs);

  return Response.json(responseObj);
}
