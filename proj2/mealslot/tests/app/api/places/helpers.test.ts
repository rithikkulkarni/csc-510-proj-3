// tests/app/api/places.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

// Mock "server-only" so importing the module works in Vitest
vi.mock("server-only", () => ({}));



/**
 * Helper: re-import the maps module with a specific MAPS_API_KEY value.
 * We have to re-import because GOOGLE_KEY is captured at module load time.
 */
async function importPlacesWithKey(key?: string) {
  const originalKey = process.env.MAPS_API_KEY;

  if (key === undefined) {
    delete process.env.MAPS_API_KEY;
  } else {
    process.env.MAPS_API_KEY = key;
  }

  // Reset module cache so GOOGLE_KEY is recomputed on import
  vi.resetModules();

  // Re-apply the server-only mock after resetModules
  vi.mock("server-only", () => ({}));

  const mod = await import("../../../../app/api/places/helpers");

  // Restore original env
  if (originalKey === undefined) {
    delete process.env.MAPS_API_KEY;
  } else {
    process.env.MAPS_API_KEY = originalKey;
  }

  return mod;
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------- toPriceStr & haversineDistanceKm ----------------

describe("toPriceStr", () => {
  it("returns undefined when price_level is not a number", async () => {
    const { toPriceStr } = await importPlacesWithKey("dummy");
    expect(toPriceStr(undefined as any)).toBeUndefined();
    expect(toPriceStr(null as any)).toBeUndefined();
    expect(toPriceStr("2" as any)).toBeUndefined();
  });

  it("clamps and rounds price_level between 1 and 4", async () => {
    const { toPriceStr } = await importPlacesWithKey("dummy");

    // Below 1 → clamp to 1
    expect(toPriceStr(0.2)).toBe("$");

    // Typical values in [1, 4]
    expect(toPriceStr(1)).toBe("$");
    expect(toPriceStr(2.3)).toBe("$$"); // rounds to 2
    expect(toPriceStr(3.7)).toBe("$$$$"); // rounds to 4

    // Above 4 → clamp to 4
    expect(toPriceStr(10)).toBe("$$$$");
  });
});

describe("haversineDistanceKm", () => {
  it("computes distance between two coordinates in km, rounded to 0.1", async () => {
    const { haversineDistanceKm } = await importPlacesWithKey("dummy");

    // Distance from (0,0) to (0,1) ≈ 111.2 km
    const dist = haversineDistanceKm(0, 0, 0, 1);
    expect(dist).toBeCloseTo(111.2, 1);

    // Distance zero
    expect(haversineDistanceKm(10, 20, 10, 20)).toBe(0);
  });
});

// ---------------- geocodeCity ----------------

describe("geocodeCity", () => {
  it("returns null and does not call fetch when MAPS_API_KEY is missing", async () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => { /* silence */ });

    const fetchSpy = vi.fn();
    (globalThis as any).fetch = fetchSpy;

    const { geocodeCity } = await importPlacesWithKey(undefined);

    const res = await geocodeCity("Raleigh, NC");
    expect(res).toBeNull();

    // No network call without key
    expect(fetchSpy).not.toHaveBeenCalled();

    // Top-level warning branch covered
    expect(warnSpy).toHaveBeenCalledWith(
      "Missing MAPS_API_KEY environment variable"
    );
  });

  it("returns null when HTTP response is not ok", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({}),
    });
    (globalThis as any).fetch = fetchSpy;

    const { geocodeCity } = await importPlacesWithKey("test-key");

    const res = await geocodeCity("Raleigh, NC");
    expect(res).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns null when response body has no geometry/location", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ results: [{}] }),
    });
    (globalThis as any).fetch = fetchSpy;

    const { geocodeCity } = await importPlacesWithKey("test-key");

    const res = await geocodeCity("Raleigh, NC");
    expect(res).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns lat/lng when response body has geometry/location", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        results: [
          { geometry: { location: { lat: 35.7796, lng: -78.6382 } } },
        ],
      }),
    });
    (globalThis as any).fetch = fetchSpy;

    const { geocodeCity } = await importPlacesWithKey("test-key");

    const res = await geocodeCity("Raleigh, NC");
    expect(res).toEqual({ lat: 35.7796, lng: -78.6382 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

// ---------------- placesTextSearch ----------------

describe("placesTextSearch", () => {
  it("returns missing_key error and does not call fetch when MAPS_API_KEY is missing", async () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => { /* silence */ });

    const fetchSpy = vi.fn();
    (globalThis as any).fetch = fetchSpy;

    const { placesTextSearch } = await importPlacesWithKey(undefined);

    const res = await placesTextSearch("pizza near me", 2);
    expect(res).toEqual({ results: [], error: "missing_key" });
    expect(fetchSpy).not.toHaveBeenCalled();

    // We hit the warning once per module import without key
    expect(warnSpy).toHaveBeenCalled();
  });

  it("returns http status error when response is not ok", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue({}),
    });
    (globalThis as any).fetch = fetchSpy;

    const { placesTextSearch } = await importPlacesWithKey("test-key");

    const res = await placesTextSearch("sushi", 2);
    expect(res.results).toEqual([]);
    expect(res.error).toBe("http_503");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns sliced results array and null error when body.results is an array", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        results: [
          { name: "Place 1" },
          { name: "Place 2" },
          { name: "Place 3" },
        ],
      }),
    });
    (globalThis as any).fetch = fetchSpy;

    const { placesTextSearch } = await importPlacesWithKey("test-key");

    const res = await placesTextSearch("coffee", 2);
    expect(res.error).toBeNull();
    expect(res.results).toHaveLength(2);
    expect(res.results[0]).toEqual({ name: "Place 1" });
    expect(res.results[1]).toEqual({ name: "Place 2" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns empty results when body.results is not an array", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        results: null,
      }),
    });
    (globalThis as any).fetch = fetchSpy;

    const { placesTextSearch } = await importPlacesWithKey("test-key");

    const res = await placesTextSearch("burger", 5);
    expect(res.error).toBeNull();
    expect(res.results).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
