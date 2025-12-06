import { describe, it, expect } from "vitest";
import { toPriceStr, haversineDistanceKm, geocodeCity, placesTextSearch } from "@/app/api/places/route";

describe("places helpers", () => {
    it("toPriceStr formats numbers between 1 and 4", () => {
        expect(toPriceStr(undefined)).toBeUndefined();
        expect(toPriceStr(null)).toBeUndefined();
        expect(toPriceStr(0)).toBe("$");
        expect(toPriceStr(1)).toBe("$");
        expect(toPriceStr(2)).toBe("$$");
        expect(toPriceStr(3.7)).toBe("$$$$");
        expect(toPriceStr(100)).toBe("$$$$");
        expect(toPriceStr(-1)).toBe("$");
    });

    it("haversineDistanceKm returns expected approximate distance", () => {
        // Sanity check: distance between two very close points should be small
        const d1 = haversineDistanceKm(37.7749, -122.4194, 37.7750, -122.4195);
        expect(d1).toBeGreaterThanOrEqual(0);
        expect(d1).toBeLessThan(1);

        // Known: approx distance SF -> LA ~ 559 km (rounded 559.0)
        const d2 = haversineDistanceKm(37.7749, -122.4194, 34.0522, -118.2437);
        expect(Math.round(d2)).toBeGreaterThanOrEqual(559 - 2);
    });

    it("geocodeCity and placesTextSearch gracefully handle missing API key", async () => {
        // In the test environment MAPS_API_KEY is not set; both helpers should return null/error accordingly
        const geo = await geocodeCity("Nowhere City");
        expect(geo).toBeNull();

        const res = await placesTextSearch("pizza in Nowhere City");
        expect(res).toBeDefined();
        expect(Array.isArray(res.results)).toBe(true);
        expect(res.error).toBe("missing_key");
    });
});
