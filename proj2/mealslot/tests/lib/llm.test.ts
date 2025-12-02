// tests/lib/llm.test.ts
import { describe, it, expect, vi } from "vitest";

// If "server-only" causes issues in Vitest, this stub keeps it harmless.
// If you don't need it, you can remove this line.
vi.mock("server-only", () => ({}));

// Adjust these imports to match your project structure if needed
import { recipesViaOpenAI } from "@/lib/llm";
import type { Dish } from "@/lib/schemas";

type Yt = { id: string; title: string; url: string; thumbnail?: string };

describe("recipesViaOpenAI - stub branch (no OPENAI_API_KEY)", () => {
  it("returns deterministic stub recipes and normalizes video thumbnails when no API key", async () => {
    const prevKey = process.env.OPENAI_API_KEY;
    try {
      // Force stub path
      delete process.env.OPENAI_API_KEY;

      const dishesInput: Dish[] = [
        {
          id: "dish_1",
          name: "Spicy Tomato Pasta (Quick)",
          category: "main",
          tags: [],
          costBand: 1,
          timeBand: 1, // fast
          isHealthy: true,
          allergens: ["gluten"],
          ytQuery: "spicy tomato pasta",
        },
        {
          id: "dish_2",
          name: "Creamy Mushroom Risotto",
          category: "meat",
          tags: [],
          costBand: 2,
          timeBand: 3, // slow
          isHealthy: false,
          allergens: ["dairy"],
          ytQuery: "mushroom risotto",
        },
      ];

      const videoLookup = vi.fn(
        async (query: string): Promise<Yt[]> => {
          if (query === "spicy tomato pasta") {
            return [
              { id: "vid1", title: "Pasta Video", url: "http://example.com/1" }, // no thumbnail
            ];
          }
          if (query === "mushroom risotto") {
            return [
              {
                id: "vid2",
                title: "Risotto Video",
                url: "http://example.com/2",
                thumbnail: "http://example.com/thumb2.jpg",
              },
            ];
          }
          return [];
        }
      );

      const result = await recipesViaOpenAI(dishesInput, videoLookup);

      // One recipe per dish
      expect(result).toHaveLength(2);

      // Now TS knows we have at least 2 items; we still use non-null assertion for safety
      const r1 = result[0]!;
      const r2 = result[1]!;

      // Called once per dish with the ytQuery string
      expect(videoLookup).toHaveBeenCalledTimes(2);
      expect(videoLookup).toHaveBeenCalledWith("spicy tomato pasta");
      expect(videoLookup).toHaveBeenCalledWith("mushroom risotto");

      // Basic ID / name / structure from stubRecipe
      expect(r1.id).toBe("rcp_dish_1_0");
      expect(r1.name).toBe("Recipe for Spicy Tomato Pasta (Quick)");
      expect(r1.servings).toBe(2);

      // timeBand=1 → fast → total_minutes 25
      expect(r1.total_minutes).toBe(25);
      // Healthy + costBand=1 + category="main" (not meat)
      expect(r1.nutrition.kcal).toBe(420); // healthy
      expect(r1.nutrition.protein_g).toBe(28); // non-meat
      expect(r1.nutrition.carbs_g).toBe(40); // costBand 1
      expect(r1.nutrition.fat_g).toBe(12); // healthy

      // Videos: thumbnail normalized to ""
      expect(r1.videos).toEqual([
        {
          id: "vid1",
          title: "Pasta Video",
          url: "http://example.com/1",
          thumbnail: "", // normalized from undefined
        },
      ]);

      // Second recipe from non-healthy, timeBand=3, meat, costBand=2
      expect(r2.id).toBe("rcp_dish_2_1");
      expect(r2.name).toBe("Recipe for Creamy Mushroom Risotto");
      expect(r2.total_minutes).toBe(50); // timeBand=3 → 50
      expect(r2.nutrition.kcal).toBe(520); // not healthy
      expect(r2.nutrition.protein_g).toBe(35); // meat
      expect(r2.nutrition.carbs_g).toBe(45); // costBand != 1
      expect(r2.nutrition.fat_g).toBe(24); // not healthy

      // Thumbnail preserved when provided
      expect(r2.videos).toEqual([
        {
          id: "vid2",
          title: "Risotto Video",
          url: "http://example.com/2",
          thumbnail: "http://example.com/thumb2.jpg",
        },
      ]);
    } finally {
      // Restore env
      if (prevKey !== undefined) {
        process.env.OPENAI_API_KEY = prevKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    }
  });
});

describe("recipesViaOpenAI - OpenAI branch (with OPENAI_API_KEY)", () => {
  it("calls OpenAI and uses parsed JSON, keeping normalized videos", async () => {
    const prevKey = process.env.OPENAI_API_KEY;
    const prevFetch = globalThis.fetch;

    try {
      process.env.OPENAI_API_KEY = "test-key";

      const dish: Dish = {
        id: "dish_3",
        name: "Garlic Butter Chicken",
        category: "meat",
        tags: [],
        costBand: 2,
        timeBand: 2,
        isHealthy: false,
        allergens: [],
        ytQuery: "garlic butter chicken",
      };

      // Mock videos for this dish
      const videoLookup = vi.fn(async (): Promise<Yt[]> => [
        {
          id: "vid3",
          title: "Chicken Video",
          url: "http://example.com/3",
          thumbnail: undefined,
        },
      ]);

      // Mock fetch to simulate an OpenAI chat completion response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  id: "custom_recipe_id",
                  name: "Custom Garlic Chicken",
                  servings: 4,
                  total_minutes: 42,
                  equipment: ["pan", "tongs"],
                  ingredients: [
                    { item: "chicken breast", qty: 500, unit: "g" },
                  ],
                  steps: [
                    { order: 1, text: "Cook chicken.", timer_minutes: 15 },
                  ],
                  nutrition: {
                    kcal: 600,
                    protein_g: 40,
                    carbs_g: 10,
                    fat_g: 35,
                  },
                  warnings: ["Very hot when served"],
                }),
              },
            },
          ],
        }),
      } as any);

      // Override global fetch for this test
      globalThis.fetch = mockFetch;

      const result = await recipesViaOpenAI([dish], videoLookup);

      expect(result).toHaveLength(1);

      const recipe = result[0]!;

      // Check that fetch was called with proper URL and headers
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const firstCall = mockFetch.mock.calls[0]!;
      const url = firstCall[0];
      const options = firstCall[1] as any;

      expect(url).toBe("https://api.openai.com/v1/chat/completions");
      expect(options.method).toBe("POST");
      expect(options.headers.authorization).toBe("Bearer test-key");

      // Parsed fields from the mocked OpenAI response
      expect(recipe.id).toBe("custom_recipe_id");
      expect(recipe.name).toBe("Custom Garlic Chicken");
      expect(recipe.servings).toBe(4);
      expect(recipe.total_minutes).toBe(42);
      expect(recipe.equipment).toEqual(["pan", "tongs"]);
      expect(recipe.ingredients).toEqual([
        { item: "chicken breast", qty: 500, unit: "g" },
      ]);
      expect(recipe.steps).toEqual([
        { order: 1, text: "Cook chicken.", timer_minutes: 15 },
      ]);
      expect(recipe.nutrition).toEqual({
        kcal: 600,
        protein_g: 40,
        carbs_g: 10,
        fat_g: 35,
      });
      expect(recipe.warnings).toEqual(["Very hot when served"]);

      // Videos should come from our normalized videoLookup result,
      // with thumbnail normalized to "":
      expect(recipe.videos).toEqual([
        {
          id: "vid3",
          title: "Chicken Video",
          url: "http://example.com/3",
          thumbnail: "",
        },
      ]);
    } finally {
      // Restore env + fetch
      if (prevKey !== undefined) {
        process.env.OPENAI_API_KEY = prevKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
      if (prevFetch) {
        globalThis.fetch = prevFetch;
      }
    }
  });
});
