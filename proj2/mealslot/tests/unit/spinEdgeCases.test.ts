import { describe, it, expect, vi } from "vitest";

// Mock the deterministic RNG to produce a value near 1 to exercise the fallback
vi.mock("@/lib/rng", () => ({
    makeDeterministicRng: () => {
        return () => 0.999999;
    },
}));

import { weightedSpin } from "@/lib/scoring";
import type { Dish } from "@/lib/schemas";

const makeDish = (
    id: string,
    healthy: boolean,
    cost: number,
    time: number
): Dish => ({
    id,
    name: id,
    category: "main",
    tags: [],
    costBand: cost,
    timeBand: time,
    isHealthy: healthy,
    allergens: [],
    ytQuery: id,
});

describe("weightedSpin edge cases", () => {
    it("returns placeholder for empty reel", () => {
        const out = weightedSpin([[]]);
        expect(out.length).toBe(1);
        expect(out[0].id.startsWith("placeholder_")).toBe(true);
    });

    it("falls back to last item when RNG picks past cumulative total (roundoff)", () => {
        const reels = [[
            makeDish("first", true, 1, 1),
            makeDish("middle", false, 2, 2),
            makeDish("last", false, 3, 3),
        ]];

        const sel = weightedSpin(reels);
        // With RNG close to 1 and finite weights, the implementation's roundoff fallback should pick the last item
        expect(sel[0].id).toBe("last");
    });
});
