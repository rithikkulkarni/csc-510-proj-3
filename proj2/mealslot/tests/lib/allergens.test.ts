import { describe, it, expect } from "vitest";
import { normalizeAllergens } from "../../lib/allergens";

describe("normalizeAllergens", () => {
    it("handles null/undefined", () => {
        expect(normalizeAllergens(null)).toEqual([]);
        expect(normalizeAllergens(undefined)).toEqual([]);
    });

    it("parses JSON array string", () => {
        const input = '["dairy","gluten"]';
        expect(normalizeAllergens(input)).toEqual(["dairy", "gluten"]);
    });

    it("parses comma separated string", () => {
        expect(normalizeAllergens("dairy, gluten , ")).toEqual(["dairy", "gluten"]);
    });

    it("parses array with JSON element and comma-separated elements", () => {
        const input = ["[\"soy\",\"peanuts\"]", "egg, fish", " ", null];
        const out = normalizeAllergens(input as any);
        // ensure duplicates removed and trimming applied
        expect(out.sort()).toEqual(["egg", "fish", "peanuts", "soy"].sort());
    });
});
