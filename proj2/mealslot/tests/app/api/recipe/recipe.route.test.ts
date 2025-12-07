// tests/app/api/recipe/recipe.routes.unit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Hoist-safe module mocks ---

// Next "server-only" helper – make it a no-op for tests
vi.mock("server-only", () => ({}));

// Mock schemas: we only need RecipeSchema.parse at runtime
vi.mock("@/lib/schemas", () => {
  const RecipeSchema = {
    parse: vi.fn((x: any) => x),
  };

  // Dish and RecipeJSON are types at runtime, but export dummy values
  const Dish = {} as any;
  const RecipeJSON = {} as any;

  return { Dish, RecipeJSON, RecipeSchema };
});

// Mock static dishes catalog
vi.mock("@/lib/dishes", () => {
  const allDishes = [
    { id: "d1", name: "Dish 1" },
    { id: "d2", name: "Dish 2" },
  ];
  return { allDishes };
});

// Mock LLM adapter
vi.mock("@/lib/llm", () => {
  return {
    recipesViaOpenAI: vi.fn(),
  };
});

// Mock YouTube helper
vi.mock("@/lib/youtube", () => {
  const videoStubsFor = vi.fn((dish: any) => [
    { id: "v1", title: `Video for ${dish?.name ?? "unknown"}` },
  ]);
  return { videoStubsFor };
});

// --- Imports that see the mocks above ---

import * as RecipesRoute from "../../../../app/api/recipe/route";
import { RecipeSchema } from "../../../../lib/schemas";
import { allDishes } from "../../../../lib/dishes";
import { recipesViaOpenAI } from "../../../../lib/llm";
import { videoStubsFor } from "../../../../lib/youtube";

const recipeSchemaMock = RecipeSchema as any;
const recipesViaOpenAIMock = recipesViaOpenAI as any;

describe("recipes route unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* -------------------- validation & JSON parse -------------------- */

  it("returns 400 when body is invalid (missing dishIds)", async () => {
    const req = new Request("http://local/api/recipes", {
      method: "POST",
      body: JSON.stringify({}), // fails zod: no dishIds
    });

    const res = await RecipesRoute.POST(req as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("handles JSON parse failure by treating body as {} and still returns 400", async () => {
    // Exercises `await req.json().catch(() => ({}))`
    const badReq = {
      json: async () => {
        throw new Error("boom");
      },
    } as any;

    const res = await RecipesRoute.POST(badReq);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  /* -------------------- success path & catalog selection -------------------- */

  it("builds catalog from allDishes, filters missing IDs, calls LLM and validates recipes", async () => {
    // sanity: our mocked catalog
    expect(allDishes.map((d: any) => d.id)).toEqual(["d1", "d2"]);

    // LLM returns two recipe JSONs
    const llmRecipes = [
      { id: "r1", title: "Recipe 1" },
      { id: "r2", title: "Recipe 2" },
    ];
    recipesViaOpenAIMock.mockResolvedValueOnce(llmRecipes);

    const req = new Request("http://local/api/recipes", {
      method: "POST",
      body: JSON.stringify({
        dishIds: ["d1", "missing-id"], // only d1 exists, missing-id is filtered out
      }),
    });

    const res = await RecipesRoute.POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.recipes)).toBe(true);
    expect(body.recipes).toEqual(llmRecipes);

    // --- Verify catalog -> selectedDishes behavior ---
    // LLM should be called with only the resolved dishes
    expect(recipesViaOpenAIMock).toHaveBeenCalledTimes(1);
    const callArgs = recipesViaOpenAIMock.mock.calls[0];
    const selectedDishes = callArgs[0] as any[];
    const videoFnArg = callArgs[1];

    // Only one dish (d1) is selected; missing-id filtered out
    expect(selectedDishes).toHaveLength(1);
    expect(selectedDishes[0].id).toBe("d1");

    // Second argument is the videoStubsFor helper
    expect(videoFnArg).toBe(videoStubsFor);

    // --- Verify RecipeSchema.parse is run on each recipe ---
    expect(recipeSchemaMock.parse).toHaveBeenCalledTimes(llmRecipes.length);
    for (const r of llmRecipes) {
      expect(recipeSchemaMock.parse).toHaveBeenCalledWith(r);
    }
  });

  it("works when all requested dishIds are unknown (passes empty array to LLM)", async () => {
    const llmRecipes = [{ id: "only", title: "Only Recipe" }];
    recipesViaOpenAIMock.mockResolvedValueOnce(llmRecipes);

    const req = new Request("http://local/api/recipes", {
      method: "POST",
      body: JSON.stringify({
        dishIds: ["unknown-1", "unknown-2"],
      }),
    });

    const res = await RecipesRoute.POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.recipes).toEqual(llmRecipes);

    // Ensure LLM got an empty selection list
    expect(recipesViaOpenAIMock).toHaveBeenCalledTimes(1);
    const callArgs = recipesViaOpenAIMock.mock.calls[0];
    const selectedDishes = callArgs[0] as any[];
    expect(selectedDishes).toEqual([]);

    // Still validates each recipe
    expect(recipeSchemaMock.parse).toHaveBeenCalledTimes(1);
    expect(recipeSchemaMock.parse).toHaveBeenCalledWith(llmRecipes[0]);
  });
});
