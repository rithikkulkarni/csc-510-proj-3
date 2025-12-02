import { describe, it, expect } from "vitest";
import {
  mergeConstraints,
  partyCodeFromSeed,
  PrefsSchema,
  DietEnum,
  AllergenEnum,
} from "@/lib/party"; // ⬅️ adjust to your actual path if needed

type Prefs = {
  nickname?: string;
  diet?: (typeof DietEnum.enum)[keyof typeof DietEnum.enum];
  allergens?: (typeof AllergenEnum.enum)[keyof typeof AllergenEnum.enum][];
  budgetBand?: number;
  timeBand?: number;
};

describe("mergeConstraints", () => {
  it("returns empty constraints when prefs list is empty", () => {
    const { merged, conflict, suggestions } = mergeConstraints([]);

    expect(merged).toEqual({});
    expect(conflict).toBe(false);
    expect(suggestions).toEqual([]);
  });

  it("ignores 'none' diets and leaves diet undefined when no real diets", () => {
    const prefs: Prefs[] = [
      { diet: "none" },
      { nickname: "A" },
      {}, // completely empty prefs
    ];

    const { merged, conflict, suggestions } = mergeConstraints(prefs);

    expect(merged.diet).toBeUndefined();
    expect(conflict).toBe(false);
    expect(suggestions).toEqual([]);
  });

  it("picks the strictest compatible ethic diet (vegan > vegetarian > pescatarian > omnivore)", () => {
    const prefs: Prefs[] = [
      { nickname: "Alice", diet: "omnivore" },
      { nickname: "Bob", diet: "vegetarian" },
      { nickname: "Cara", diet: "vegan" },
      { nickname: "Dave", diet: "keto" }, // orthogonal, but still present
    ];

    const { merged, conflict, suggestions } = mergeConstraints(prefs);

    expect(merged.diet).toEqual(["vegan"]);
    expect(conflict).toBe(false);
    expect(suggestions).toEqual([]);
  });

  it("merges allergens as a union of all members' allergens", () => {
    const prefs: Prefs[] = [
      { nickname: "A", allergens: ["gluten", "dairy"] },
      { nickname: "B", allergens: ["peanut"] },
      { nickname: "C", allergens: ["dairy", "soy"] },
    ];

    const { merged } = mergeConstraints(prefs);

    // Order is not strictly guaranteed, but Set() + Array.from() is stable enough
    expect(new Set(merged.allergens)).toEqual(
      new Set(["gluten", "dairy", "peanut", "soy"])
    );
  });

  it("merges budgetBand and timeBand as the minimum across members", () => {
    const prefs: Prefs[] = [
      { nickname: "A", budgetBand: 3, timeBand: 2 },
      { nickname: "B", budgetBand: 1 }, // tighter budget
      { nickname: "C", timeBand: 1 },   // faster-only
    ];

    const { merged } = mergeConstraints(prefs);

    expect(merged.budgetBand).toBe(1); // MIN of 3 and 1
    expect(merged.timeBand).toBe(1);   // MIN of 2 and 1
  });

  it("flags conflict when vegan diet plus many allergens make things too restrictive", () => {
    const prefs: Prefs[] = [
      {
        nickname: "VeganAllergic",
        diet: "vegan",
        allergens: ["soy", "peanut", "tree_nut", "gluten"],
      },
    ];

    const { merged, conflict, suggestions } = mergeConstraints(prefs);

    expect(merged.diet).toEqual(["vegan"]);
    expect(new Set(merged.allergens)).toEqual(
      new Set(["soy", "peanut", "tree_nut", "gluten"])
    );

    expect(conflict).toBe(true);
    expect(suggestions).toContain(
      "Too many allergens with vegan. Consider dropping one or relaxing to vegetarian."
    );
  });

  it("validates PrefsSchema with Zod (happy path)", () => {
    const parsed = PrefsSchema.parse({
      nickname: "Tester",
      diet: "vegetarian",
      allergens: ["gluten", "dairy"],
      budgetBand: 2,
      timeBand: 1,
    });

    expect(parsed.nickname).toBe("Tester");
    expect(parsed.diet).toBe("vegetarian");
    expect(parsed.allergens).toEqual(["gluten", "dairy"]);
    expect(parsed.budgetBand).toBe(2);
    expect(parsed.timeBand).toBe(1);
  });

  it("rejects invalid Prefs with Zod (bad budgetBand/timeBand)", () => {
    expect(() =>
      PrefsSchema.parse({
        nickname: "BadUser",
        budgetBand: 4,  // out of 1–3
        timeBand: 0,    // out of 1–3
      })
    ).toThrow();
  });
});

describe("partyCodeFromSeed", () => {
  it("produces a deterministic 6-character uppercase alphanumeric code", () => {
    const seed = "example-seed-123";
    const code1 = partyCodeFromSeed(seed);
    const code2 = partyCodeFromSeed(seed);

    expect(code1).toBe(code2);         // deterministic
    expect(code1).toHaveLength(6);
    expect(/^[A-Z0-9]{6}$/.test(code1)).toBe(true); // upper-case base36
  });

  it("produces different codes for different seeds (practically)", () => {
    const codeA = partyCodeFromSeed("alice");
    const codeB = partyCodeFromSeed("bob");

    // Not mathematically guaranteed, but extremely likely
    expect(codeA).not.toBe(codeB);
  });
});
