// tests/api/allergensRoute.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Mocks that must be hoisted-safe ---

// "server-only" is a Next server-side helper; mock it to a no-op so Vitest is happy.
vi.mock("server-only", () => ({}));

// Mock the actions module; we'll grab the mock function after imports.
vi.mock("../../../../app/actions", () => ({
  getAllAllergens: vi.fn(),
}));

// We don't need to mock "@/lib/party" — we want the real ALLERGEN_OPTIONS.

// --- Imports that use the mocks above ---
import { GET } from "../../../../app/api/allergens/route";
import { ALLERGEN_OPTIONS } from "../../../../lib/party";
import { getAllAllergens } from "../../../../app/actions";

describe("GET /api/allergens route", () => {
  const getAllAllergensMock = getAllAllergens as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns merged, unique, sorted allergens on success", async () => {
    // Arrange: backend returns some allergens, including overlap & new ones
    (getAllAllergensMock as any).mockResolvedValueOnce([
      "Peanut",
      "Egg",
      ALLERGEN_OPTIONS[0],
    ]);

    // Act
    const res = await GET({} as any);
    const data = await res.json();

    // Assert: backend was called
    expect(getAllAllergensMock).toHaveBeenCalled();

    // Assert: structure
    expect(Array.isArray(data.allergens)).toBe(true);

    const allergens: string[] = data.allergens;

    // Contains options from ALLERGEN_OPTIONS
    ALLERGEN_OPTIONS.forEach((opt) => {
      expect(allergens).toContain(opt);
    });

    // Contains our extra from the mock
    expect(allergens).toContain("Peanut");

    // Unique (no duplicates)
    expect(allergens).toEqual([...new Set(allergens)]);

    // Sorted lexicographically
    const sorted = [...allergens].sort((a, b) => a.localeCompare(b));
    expect(allergens).toEqual(sorted);

    // Default status is 200
    expect(res.status).toBe(200);
  });

  it("falls back to ALLERGEN_OPTIONS and logs error when getAllAllergens throws", async () => {
    const error = new Error("DB down");
    (getAllAllergensMock as any).mockRejectedValueOnce(error);

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => { /* silence in tests */ });

    const res = await GET({} as any);
    const data = await res.json();

    // Should have tried to fetch
    expect(getAllAllergensMock).toHaveBeenCalled();

    // Should have logged the error
    expect(consoleSpy).toHaveBeenCalled();

    // Fallback body uses ALLERGEN_OPTIONS exactly
    expect(data.allergens).toEqual(ALLERGEN_OPTIONS);

    // Fallback still responds with 200
    expect(res.status).toBe(200);
  });
});
