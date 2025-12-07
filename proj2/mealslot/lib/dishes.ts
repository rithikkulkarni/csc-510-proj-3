/**
 * Dish catalog + filters
 *
 * Provides a DB-backed dish query with tag and allergen filtering,
 * plus a static fallback catalog for categories that have no rows
 * in the database. Converts raw DB rows into the UI-facing Dish
 * shape used by the slot machine and related components.
 */

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { Dish as UIDish } from "./schemas"; // UI/Spin Dish type (arrays)
import { normalizeAllergens } from "../lib/allergens";

/**
 * Splits a comma-separated string into a trimmed, non-empty array.
 */
function splitCSV(s: string | null | undefined): string[] {
  return (s ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Maps a raw DB row into the UI Dish type, converting encoded
 * tags/allergens into normalized arrays.
 */
function toUIDish(row: {
  id: string;
  name: string;
  category: string;
  tags: string;
  allergens: string;
  costBand: number;
  timeBand: number;
  isHealthy: boolean;
  ytQuery: string | null;
}): UIDish {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    tags: splitCSV(row.tags),
    // preserve whatever tokens are stored in the DB (trimmed), but expose as an array
    allergens: normalizeAllergens(row.allergens),
    costBand: row.costBand,
    timeBand: row.timeBand,
    isHealthy: row.isHealthy,
    ytQuery: row.ytQuery ?? "",
  };
}

/**
 * Normalizes flexible array/JSON/string fields from Prisma into
 * a lowercase string array for filtering (tags, etc.).
 */
const parseArrayField = (v: any): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) {
    // sometimes Prisma returns array of one string like '["dairy","gluten"]'
    if (v.length === 1 && v[0].startsWith('["')) {
      return v[0]
        .replace(/^\[|]$/g, "") // remove [ and ]
        .split(",")
        .map((s: string) => s.replace(/"/g, "").trim().toLowerCase());
    }
    return v.map((s: string) => s.trim().toLowerCase());
  }
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed))
        return parsed.map((s: string) => s.trim().toLowerCase());
    } catch {}
    return v.split(",").map((s: string) => s.trim().toLowerCase());
  }
  return [];
};

// ---- STATIC FALLBACK (your existing catalog) ----
type Raw = [
  name: string,
  costBand: number,
  timeBand: number,
  isHealthy: boolean,
  allergens: string[],
  ytQuery: string,
];

// … keep your existing static arrays here (MAIN / VEGGIE / SOUP / MEAT / DESSERT) …
// … and the expand() logic you already had …

// Example structure (you already had these in your original code):
const MAIN: Raw[] = [
  // ["Spaghetti", 2, 2, true, ["gluten"], "spaghetti bolognese"],
  // ...
];
const VEGGIE: Raw[] = [];
const SOUP: Raw[] = [];
const MEAT: Raw[] = [];
const DESSERT: Raw[] = [];

/**
 * Converts a list of Raw tuples into UIDish objects and
 * assigns a category label.
 */
function fromRaw(category: string, raw: Raw[]): UIDish[] {
  return raw.map(
    ([name, costBand, timeBand, isHealthy, allergens, ytQuery]) => ({
      id: `${category}-${name}`, // or whatever you were using
      name,
      category,
      costBand,
      timeBand,
      isHealthy,
      allergens,
      tags: [], // or any tags you had
      ytQuery,
    }),
  );
}

// Build STATIC_BY_CAT from those arrays
const STATIC_BY_CAT: Record<string, UIDish[]> = {
  MAIN: fromRaw("MAIN", MAIN),
  VEGGIE: fromRaw("VEGGIE", VEGGIE),
  SOUP: fromRaw("SOUP", SOUP),
  MEAT: fromRaw("MEAT", MEAT),
  DESSERT: fromRaw("DESSERT", DESSERT),
};

// ---- DB-first, fallback to static ----

/**
 * Fetches dishes for a given category from the database, applying
 * inclusive tag filters and exclusive allergen filters.
 *
 * - If the DB has no rows for that category, falls back to STATIC_BY_CAT.
 * - Tags: dish must contain all selected tags (AND).
 * - Allergens: dish is excluded if it matches any selected allergen.
 */
export async function dishes(
  category: string,
  tags: string[] = [],
  allergens: string[] = [],
): Promise<UIDish[]> {
  const where: Prisma.DishWhereInput = { category };
  const rows = await prisma.dish.findMany({
    where,
    orderBy: [{ name: "asc" }],
  });

  if (rows.length === 0) {
    return (STATIC_BY_CAT[category] ?? []).slice();
  }

  const norm = (s: string) => s.trim().toLowerCase();

  const selectedTags = tags.map(norm);
  // normalize requested allergens using the permissive normalizer, then compare case-insensitively
  const excludedAllergensLower = normalizeAllergens(allergens).map((a) =>
    a.toLowerCase(),
  );

  const filtered = rows.filter((r) => {
    const rTags = parseArrayField(r.tags); // normalized lowercase array
    // preserve DB tokens for UI but compare lowercase for filtering
    const rAllergensPreserve = normalizeAllergens(r.allergens);
    const rAllergensLower = rAllergensPreserve.map((a) => a.toLowerCase());

    // TAGS: keep dish only if it contains ALL selected tags (unchanged)
    const tagsOk =
      selectedTags.length === 0 ||
      selectedTags.every((t) => rTags.includes(t));

    // ALLERGENS: EXCLUDE dish if it contains ANY selected allergen (reversed logic)
    const allergensOk =
      excludedAllergensLower.length === 0 ||
      rAllergensLower.every((a) => !excludedAllergensLower.includes(a));

    return tagsOk && allergensOk;
  });

  // convert to UI shape
  return filtered.map(toUIDish);
}

// Export allDishes as a flat array of everything
export const allDishes: UIDish[] = Object.values(STATIC_BY_CAT).flat();
