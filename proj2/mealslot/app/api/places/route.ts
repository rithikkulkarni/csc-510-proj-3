import "server-only";
import { NextRequest } from "next/server";
import { z } from "zod";
import { toPriceStr, haversineDistanceKm, geocodeCity, placesTextSearch } from './helpers';

const Body = z.object({
  cuisines: z.array(z.string().min(1)).min(1),
  locationHint: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional()
});

// helpers are implemented in ./helpers — exported there for unit tests.

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
  } else {
    try {
      origin = await geocodeCity(city);
      if (!origin) responseObj.notice = "Could not geocode location; distance omitted.";
    } catch (e) {
      responseObj.notice = "Error geocoding location; distance omitted.";
    }
  }

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
        const addr: string | undefined = r.formatted_address ?? r.vicinity;
        const rating: number | undefined = typeof r.rating === "number" ? r.rating : undefined;
        const price = toPriceStr(r.price_level);
        const lat = r.geometry?.location?.lat;
        const lng = r.geometry?.location?.lng;
        const distance_km =
          origin && typeof lat === "number" && typeof lng === "number"
            ? haversineDistanceKm(origin.lat, origin.lng, lat, lng)
            : undefined;
        const url = place_id
          ? `https://www.google.com/maps/place/?q=place_id:${place_id}`
          : undefined;

        return { id: `g_${place_id ?? `${dish}_${i}`}`, name, addr, rating, price, url, cuisine: dish, distance_km, lat, lng };
      });

      responseObj.results[dish] = mapped;
    } catch (err: any) {
      responseObj.errors.push({ cuisine: dish, message: err?.message ?? String(err) });
      responseObj.results[dish] = [];
    }
  });

  await Promise.all(jobs);

  return Response.json(responseObj);
}
