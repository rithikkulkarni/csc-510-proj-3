// tests/app/api/filters/filters.route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------- Hoisted-safe mocks ----------------------

// Next.js "server-only" helper – no-op in tests
vi.mock("server-only", () => ({}));

// Mock Prisma client. We create the fn inside the factory and then
// access it through the imported prisma below.
vi.mock("@/lib/db", () => ({
  prisma: {
    dish: {
      findMany: vi.fn(),
    },
  },
}));

// ---------------- Imports that use mocks -------------------
import { GET } from "../../../../app/api/filters/route";
import { prisma } from "../../../../lib/db";

// Convenience handle for the mocked method
const dishFindManyMock = prisma.dish.findMany as unknown as ReturnType<typeof vi.fn>;

describe("GET /api/filters route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns flattened unique tags and normalized allergens on success", async () => {
    // Arrange: mix JSON + CSV + empty entries; also include aliasable + junk allergens
    dishFindManyMock.mockResolvedValueOnce([
      // JSON tags + JSON allergens
      {
        tags: '["vegan", "quick"]',
        allergens: '["Peanut", "Tree Nut", "[object Object]"]',
      },
      // CSV tags + CSV allergens (plus "object" junk)
      {
        tags: "spicy, quick",
        allergens: "Dairy, treenut, object",
      },
      // No tags / allergens – exercises the guard clauses
      {
        tags: null,
        allergens: null,
      },
    ]);

    const req = { url: "http://localhost/api/filters" } as any;

    // Act
    const res = await GET(req);
    const data = await res.json();

    // Assert: Prisma called correctly
    expect(dishFindManyMock).toHaveBeenCalledWith({
      select: { tags: true, allergens: true },
    });

    // Tags: flattened, unique, non-empty
    expect(Array.isArray(data.tags)).toBe(true);
    const tags: string[] = data.tags;
    expect(tags).toEqual(expect.arrayContaining(["vegan", "quick", "spicy"]));
    expect(tags.every((t) => t && t.trim().length > 0)).toBe(true);

    // Allergens: normalized + aliases applied + junk filtered + sorted
    expect(Array.isArray(data.allergens)).toBe(true);
    const allergens: string[] = data.allergens;

    // Expected normalized set:
    //  "Peanut"  -> "peanut"
    //  "Tree Nut" + "treenut" -> alias "nuts"
    //  "Dairy" -> "dairy"
    //  "[object Object]" / "object" removed
    expect(allergens).toEqual(["dairy", "nuts", "peanut"]);
    expect(allergens).not.toContain("object");
    expect(allergens).not.toContain("[object object]");

    expect(res.status).toBe(200);
  });

  it("returns empty arrays and 500 status when Prisma throws", async () => {
    const error = new Error("DB down");
    dishFindManyMock.mockRejectedValueOnce(error);

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => { /* silence */ });

    const req = { url: "http://localhost/api/filters" } as any;

    const res = await GET(req);
    const data = await res.json();

    expect(dishFindManyMock).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    expect(data).toEqual({ tags: [], allergens: [] });
    expect(res.status).toBe(500);
  });
});
