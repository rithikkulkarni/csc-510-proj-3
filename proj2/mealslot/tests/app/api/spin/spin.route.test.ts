// tests/app/api/spin/spin.route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Hoist-safe module mocks ---

// Next "server-only" helper – make it a no-op for tests
vi.mock("server-only", () => ({}));

// Mock dishes helper
vi.mock("@/lib/dishes", () => {
  return {
    dishes: vi.fn(),
  };
});

// Mock schemas: Dish/PowerUpsInput are only types at runtime; export dummies
vi.mock("@/lib/schemas", () => {
  const Dish = {} as any;
  const PowerUpsInput = {} as any;
  return { Dish, PowerUpsInput };
});

// Mock scoring helper
vi.mock("@/lib/scoring", () => {
  return {
    weightedSpin: vi.fn(),
  };
});

// Prisma mock, same style as your party routes
vi.mock("@/lib/db", () => {
  const prisma = {
    spin: {
      create: vi.fn().mockResolvedValue({ id: "spin-record-id" }),
    },
  } as any;
  return { prisma };
});

// --- Imports that see the mocks above ---

import { prisma } from "../../../../lib/db";
import { dishes } from "../../../../lib/dishes";
import { weightedSpin } from "../../../../lib/scoring";
import * as SpinRoute from "../../../../app/api/spin/route";

const dishesMock = dishes as any;
const weightedSpinMock = weightedSpin as any;
const prismaSpinCreateMock = prisma.spin.create as any;

describe("spin route unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: dishes returns two simple dishes
    dishesMock.mockResolvedValue([
      { id: "dA" },
      { id: "dB" },
    ]);

    // Default: weightedSpin returns first dish from each reel
    weightedSpinMock.mockImplementation((reels: any) =>
      reels.map((r: any) => r[0]),
    );

    prismaSpinCreateMock.mockResolvedValue({ id: "spin-record-id" });
  });

  /* -------------------- validation & JSON parse -------------------- */

  it("returns 400 with issues when zod validation fails (bad category type)", async () => {
    const req = new Request("http://local/api/spin", {
      method: "POST",
      body: JSON.stringify({ category: 123 }), // not a string -> zod error
    });

    const res = await SpinRoute.POST(req as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("returns 400 with message when JSON parse fails and no category/categories provided", async () => {
    // Exercises `await req.json().catch(() => ({}))` and then
    // the slotCategories.length === 0 check
    const badReq = {
      json: async () => {
        throw new Error("boom");
      },
    } as any;

    const res = await SpinRoute.POST(badReq);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toEqual({
      message: "category or categories is required",
    });
  });

  it("returns 400 with message when body is valid but missing category and categories", async () => {
    const req = new Request("http://local/api/spin", {
      method: "POST",
      body: JSON.stringify({
        tags: ["spicy"],
        allergens: ["nuts"],
        powerups: { healthy: true },
      }),
    });

    const res = await SpinRoute.POST(req as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toEqual({
      message: "category or categories is required",
    });
  });

  /* -------------------- categories array path -------------------- */

  it("uses categories array, normalizes locked entries, and calls weightedSpin/prisma", async () => {
    const reqBody = {
      categories: ["A", "B"], // new API
      tags: ["t1"],
      allergens: ["a1"],
      powerups: { healthy: true, cheap: false, max30m: true },
      locked: [
        { index: 0, dishId: "locked-0" }, // kept
        2,                                 // number: ignored by route
        { index: 1, dishId: "locked-1" }, // kept
      ],
      dishCount: 3, // more slots than categories length
    };

    // Make dishes depend on category so we can check slot category selection
    dishesMock.mockImplementation(
      async (category: string, tags: string[], allergens: string[]) => [
        { id: `${category}-d1`, tags, allergens },
        { id: `${category}-d2`, tags, allergens },
      ],
    );

    const req = new Request("http://local/api/spin", {
      method: "POST",
      body: JSON.stringify(reqBody),
    });

    const res = await SpinRoute.POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.reels)).toBe(true);
    expect(Array.isArray(body.selection)).toBe(true);
    expect(typeof body.spinId).toBe("string");
    expect(body.spinId.startsWith("spin_")).toBe(true);

    // slotCategories: ['A','B']; count = 3 => categories: A, B, A (fallback to first)
    expect(dishesMock).toHaveBeenCalledTimes(3);
    expect(dishesMock).toHaveBeenNthCalledWith(1, "A", ["t1"], ["a1"]);
    expect(dishesMock).toHaveBeenNthCalledWith(2, "B", ["t1"], ["a1"]);
    expect(dishesMock).toHaveBeenNthCalledWith(3, "A", ["t1"], ["a1"]);

    // locked normalized: only the two valid objects remain
    const expectedLocked = [
      { index: 0, dishId: "locked-0" },
      { index: 1, dishId: "locked-1" },
    ];

    // weightedSpin called with reels, lockedInput, powerups
    expect(weightedSpinMock).toHaveBeenCalledTimes(1);
    const [reelsArg, lockedArg, powerupsArg] = weightedSpinMock.mock
      .calls[0] as any[];

    expect(Array.isArray(reelsArg)).toBe(true);
    expect(lockedArg).toEqual(expectedLocked);
    expect(powerupsArg).toEqual(reqBody.powerups);

    // prisma.spin.create called with JSONified reels/locked/powerups/resultDishIds
    expect(prismaSpinCreateMock).toHaveBeenCalledTimes(1);
    const prismaArg = prismaSpinCreateMock.mock.calls[0][0];
    const data = prismaArg.data;

    const reelsIds = JSON.parse(data.reelsJson);
    const lockedJson = JSON.parse(data.lockedJson);
    const resultDishIds = JSON.parse(data.resultDishIds);
    const powerupsJson = JSON.parse(data.powerupsJson);

    expect(lockedJson).toEqual(expectedLocked);
    expect(powerupsJson).toEqual(reqBody.powerups);
    expect(Array.isArray(reelsIds)).toBe(true);
    expect(Array.isArray(resultDishIds)).toBe(true);

    // Selection comes from weightedSpinMock (first dish in each reel)
    expect(body.selection.length).toBe(3);
    expect(resultDishIds.length).toBe(3);
  });

  /* -------------------- legacy category + dishCount -------------------- */

  it("supports legacy single category with dishCount", async () => {
    const reqBody = {
      category: "Dinner",
      dishCount: 2,
      tags: ["t"],
      allergens: [],
      powerups: { cheap: true },
    };

    dishesMock.mockImplementation(
      async (category: string, _tags: string[], _allergens: string[]) => [
        { id: `${category}-x` },
      ],
    );

    const req = new Request("http://local/api/spin", {
      method: "POST",
      body: JSON.stringify(reqBody),
    });

    const res = await SpinRoute.POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.reels.length).toBe(2);

    // Both reels should use "Dinner"
    expect(dishesMock).toHaveBeenCalledTimes(2);
    expect(dishesMock).toHaveBeenNthCalledWith(1, "Dinner", ["t"], []);
    expect(dishesMock).toHaveBeenNthCalledWith(2, "Dinner", ["t"], []);

    // Powerups passed through to weightedSpin
    const [, , powerupsArg] = weightedSpinMock.mock.calls[0] as any[];
    expect(powerupsArg).toEqual(reqBody.powerups);
  });

  /* -------------------- fallback 'Dinner' when categories are empty strings -------------------- */

  it('falls back to "Dinner" when categories are [""]', async () => {
    const reqBody = {
      categories: [""], // empty string, so we hit the "Dinner" fallback
      tags: [],
      allergens: [],
    };

    dishesMock.mockImplementation(
      async (category: string) => [{ id: `${category}-id` }],
    );

    const req = new Request("http://local/api/spin", {
      method: "POST",
      body: JSON.stringify(reqBody),
    });

    const res = await SpinRoute.POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.reels.length).toBe(1);

    // Inside for-loop, slotCategory becomes "Dinner"
    expect(dishesMock).toHaveBeenCalledTimes(1);
    expect(dishesMock).toHaveBeenCalledWith("Dinner", [], []);
  });

  /* -------------------- prisma spin.create failure is non-fatal -------------------- */

  it("logs a warning when prisma.spin.create fails but still returns 200", async () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => { /* silence */ });

    prismaSpinCreateMock.mockRejectedValueOnce(new Error("db down"));

    const req = new Request("http://local/api/spin", {
      method: "POST",
      body: JSON.stringify({
        category: "Dinner",
        dishCount: 1,
      }),
    });

    const res = await SpinRoute.POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.spinId).toMatch(/^spin_/);
    expect(Array.isArray(body.reels)).toBe(true);
    expect(Array.isArray(body.selection)).toBe(true);

    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toBe(
      "spin persist failed (non-fatal):",
    );
  });

  /* -------------------- outer INTERNAL_ERROR catch -------------------- */

  it("returns 500 INTERNAL_ERROR when dishes throws", async () => {
    const error = new Error("kitchen down");
    dishesMock.mockRejectedValueOnce(error);

    const errSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => { /* silence */ });

    const req = new Request("http://local/api/spin", {
      method: "POST",
      body: JSON.stringify({
        category: "Dinner",
        dishCount: 1,
      }),
    });

    const res = await SpinRoute.POST(req as any);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.message).toBe("kitchen down");

    expect(errSpy).toHaveBeenCalled();
  });
});
