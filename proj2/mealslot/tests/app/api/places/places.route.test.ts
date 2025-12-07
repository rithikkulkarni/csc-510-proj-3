// tests/app/api/places/places.routes.unit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Hoist-safe module mocks ---

// Next "server-only" helper – make it a no-op for tests
vi.mock("server-only", () => ({}));

// Mock the places helpers used by the route
vi.mock("../../../../app/api/places/helpers", () => {
  return {
    toPriceStr: vi.fn(),
    haversineDistanceKm: vi.fn(),
    geocodeCity: vi.fn(),
    placesTextSearch: vi.fn(),
  };
});

// --- Imports that see the mocks above ---

import * as PlacesRoute from "../../../../app/api/places/route";
import {
  toPriceStr,
  haversineDistanceKm,
  geocodeCity,
  placesTextSearch,
} from "../../../../app/api/places/helpers";

const toPriceStrMock = toPriceStr as any;
const haversineMock = haversineDistanceKm as any;
const geocodeCityMock = geocodeCity as any;
const placesTextSearchMock = placesTextSearch as any;

describe("places route unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // default neutral behavior for helpers
    toPriceStrMock.mockReturnValue(undefined);
    haversineMock.mockReturnValue(0);
  });

  /* -------------------- validation & JSON parse -------------------- */

  it("returns 400 when body is invalid (zod fails)", async () => {
    const req = new Request("http://local/api/places", {
      method: "POST",
      body: JSON.stringify({}), // missing cuisines
    });

    const res = await PlacesRoute.POST(req as any);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe("BAD_REQUEST");
    expect(Array.isArray(data.issues)).toBe(true);
    expect(data.issues.length).toBeGreaterThan(0);
  });

  it("handles JSON parse failure by treating body as {}", async () => {
    // This exercises the json().catch(() => ({})) branch
    const badReq = {
      json: async () => {
        throw new Error("boom");
      },
    } as any;

    const res = await PlacesRoute.POST(badReq);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe("BAD_REQUEST");
  });

  /* -------------------- origin from lat/lng -------------------- */

  it("uses provided lat/lng instead of geocoding and computes distance", async () => {
    const cuisine = "sushi";

    // geocodeCity should NOT be used here
    geocodeCityMock.mockResolvedValue({ lat: 999, lng: 999 });

    const restaurantLat = 35.0;
    const restaurantLng = -78.0;

    placesTextSearchMock.mockResolvedValue({
      error: null,
      results: [
        {
          place_id: "place123",
          name: "Sushi Place",
          formatted_address: "123 Fish St",
          rating: 4.7,
          price_level: 2,
          geometry: {
            location: { lat: restaurantLat, lng: restaurantLng },
          },
        },
      ],
    });

    toPriceStrMock.mockReturnValue("$$");
    haversineMock.mockReturnValue(12.34);

    const req = new Request("http://local/api/places", {
      method: "POST",
      body: JSON.stringify({
        cuisines: [cuisine],
        lat: 10,
        lng: 20,
      }),
    });

    const res = await PlacesRoute.POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();

    // geocodeCity must NOT be called when lat/lng provided
    expect(geocodeCityMock).not.toHaveBeenCalled();

    expect(data.notice).toBeUndefined();
    expect(data.errors).toEqual([]);
    expect(data.results[cuisine]).toHaveLength(1);

    const r = data.results[cuisine][0];
    expect(r.id).toBe("g_place123");
    expect(r.name).toBe("Sushi Place");
    expect(r.addr).toBe("123 Fish St");
    expect(r.rating).toBe(4.7);
    expect(r.price).toBe("$$");
    expect(r.cuisine).toBe(cuisine);
    expect(r.distance_km).toBe(12.34);
    expect(r.lat).toBe(restaurantLat);
    expect(r.lng).toBe(restaurantLng);
    expect(r.url).toBe(
      "https://www.google.com/maps/place/?q=place_id:place123",
    );

    // distance calculator got the correct coordinates
    expect(haversineMock).toHaveBeenCalledWith(
      10,
      20,
      restaurantLat,
      restaurantLng,
    );
  });

  /* -------------------- geocoding & city sanitization -------------------- */

  it("geocodes when lat/lng not provided and sanitizes locationHint", async () => {
    const cuisine = "pizza";
    const cityHint = "Raleigh, NC!!!";

    geocodeCityMock.mockResolvedValue({ lat: 1, lng: 2 });

    // non-numeric rating, missing price_level, bad geometry
    placesTextSearchMock.mockResolvedValue({
      error: null,
      results: [
        {
          place_id: undefined,
          name: "Pizza Spot",
          vicinity: "456 Slice Ave",
          rating: "4.2", // should become undefined
          geometry: {
            location: { lat: "not-a-number", lng: null },
          },
        },
      ],
    });

    toPriceStrMock.mockReturnValue(undefined);

    const req = new Request("http://local/api/places", {
      method: "POST",
      body: JSON.stringify({
        cuisines: [cuisine],
        locationHint: cityHint,
      }),
    });

    const res = await PlacesRoute.POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();

    // Geocoding should have been called with sanitized city name
    expect(geocodeCityMock).toHaveBeenCalledTimes(1);
    const calledCity = geocodeCityMock.mock.calls[0][0] as string;
    expect(calledCity).toBe("Raleigh NC"); // punctuation stripped

    const r = data.results[cuisine][0];

    // Fallback id when no place_id
    expect(r.id).toBe("g_pizza_0");
    expect(r.name).toBe("Pizza Spot");
    expect(r.addr).toBe("456 Slice Ave");

    // rating becomes undefined (was string)
    expect(r.rating).toBeUndefined();
    // price from helper (undefined in this test)
    expect(r.price).toBeUndefined();
    // distance_km undefined because lat/lng invalid
    expect(r.distance_km).toBeUndefined();
    // url undefined because no place_id
    expect(r.url).toBeUndefined();
  });

  it("uses default 'Your City' when locationHint is missing", async () => {
    const cuisine = "ramen";

    geocodeCityMock.mockResolvedValue({ lat: 3, lng: 4 });

    placesTextSearchMock.mockResolvedValue({
      error: null,
      results: [
        {
          place_id: "ramen123",
          name: "Ramen House",
          formatted_address: "999 Broth Rd",
          rating: 4.2,
          price_level: 2,
          geometry: {
            location: { lat: 10, lng: 20 },
          },
        },
      ],
    });

    toPriceStrMock.mockReturnValue("$$");

    const req = new Request("http://local/api/places", {
      method: "POST",
      body: JSON.stringify({
        cuisines: [cuisine],
        // no locationHint
      }),
    });

    const res = await PlacesRoute.POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();

    // Geocode called with default city
    expect(geocodeCityMock).toHaveBeenCalledTimes(1);
    const calledCity = geocodeCityMock.mock.calls[0][0] as string;
    expect(calledCity).toBe("Your City");

    expect(data.notice).toBeUndefined(); // origin not null
    expect(data.results[cuisine]).toHaveLength(1);
  });

  it("sets notice when geocoding returns null and still returns results (no distance)", async () => {
    const cuisine = "thai";

    geocodeCityMock.mockResolvedValue(null);

    placesTextSearchMock.mockResolvedValue({
      error: null,
      results: [
        {
          place_id: "xyz",
          name: "Thai Place",
          formatted_address: "789 Curry Rd",
          rating: 4.0,
          price_level: 3,
          geometry: {
            location: { lat: 40, lng: -80 },
          },
        },
      ],
    });

    toPriceStrMock.mockReturnValue("$$$");

    const req = new Request("http://local/api/places", {
      method: "POST",
      body: JSON.stringify({
        cuisines: [cuisine],
        locationHint: "Some City",
      }),
    });

    const res = await PlacesRoute.POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.notice).toBe("Could not geocode location; distance omitted.");
    const r = data.results[cuisine][0];
    // distance_km should be undefined because origin is null
    expect(r.distance_km).toBeUndefined();
    expect(r.price).toBe("$$$");
  });

  it("sets notice when geocoding throws and still returns results (no distance)", async () => {
    const cuisine = "indian";

    geocodeCityMock.mockRejectedValue(new Error("geocode failed"));

    placesTextSearchMock.mockResolvedValue({
      error: null,
      results: [
        {
          place_id: "ind123",
          name: "Indian Place",
          formatted_address: "123 Spice Blvd",
          rating: 5,
          price_level: 1,
          geometry: {
            location: { lat: 50, lng: -90 },
          },
        },
      ],
    });

    toPriceStrMock.mockReturnValue("$");

    const req = new Request("http://local/api/places", {
      method: "POST",
      body: JSON.stringify({
        cuisines: [cuisine],
        locationHint: "Another City",
      }),
    });

    const res = await PlacesRoute.POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.notice).toBe("Error geocoding location; distance omitted.");
    expect(data.errors).toEqual([]);
    expect(data.results[cuisine]).toHaveLength(1);
  });

  /* -------------------- per-cuisine error handling -------------------- */

  it("handles placesTextSearch error field per cuisine", async () => {
    const cuisines = ["mexican", "korean"];

    geocodeCityMock.mockResolvedValue({ lat: 1, lng: 2 });

    placesTextSearchMock
      .mockResolvedValueOnce({
        error: "some error",
        results: [],
      })
      .mockResolvedValueOnce({
        error: null,
        results: [
          {
            place_id: "kor123",
            name: "Korean BBQ",
            formatted_address: "111 Grill St",
            rating: 4.5,
            price_level: 2,
            geometry: {
              location: { lat: 60, lng: -100 },
            },
          },
        ],
      });

    toPriceStrMock.mockReturnValue("$$");
    haversineMock.mockReturnValue(7.89);

    const req = new Request("http://local/api/places", {
      method: "POST",
      body: JSON.stringify({
        cuisines,
        locationHint: "City",
      }),
    });

    const res = await PlacesRoute.POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();

    // mexican: error path
    expect(data.results.mexican).toEqual([]);
    expect(data.errors).toContainEqual({
      cuisine: "mexican",
      message: "some error",
    });

    // korean: success path
    expect(data.results.korean).toHaveLength(1);
    const r = data.results.korean[0];
    expect(r.name).toBe("Korean BBQ");
    expect(r.distance_km).toBe(7.89);
  });

  it("handles placesTextSearch throwing an exception per cuisine", async () => {
    const cuisines = ["ramen"];

    geocodeCityMock.mockResolvedValue({ lat: 5, lng: 6 });

    placesTextSearchMock.mockRejectedValue(new Error("search failed"));

    const req = new Request("http://local/api/places", {
      method: "POST",
      body: JSON.stringify({
        cuisines,
        locationHint: "City",
      }),
    });

    const res = await PlacesRoute.POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.results.ramen).toEqual([]);
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0].cuisine).toBe("ramen");
    expect(data.errors[0].message).toBe("search failed");
  });
});
