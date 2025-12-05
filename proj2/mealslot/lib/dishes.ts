import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { Dish as UIDish } from "./schemas";

// Parse JSON / CSV-ish text into a lowercased string[]
const parseArrayField = (v: any): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) {
    if (v.length === 1 && typeof v[0] === "string" && v[0].startsWith('["')) {
      // handle single JSON-stringified array in an array
      return v[0]
        .replace(/^\[|]$/g, "")
        .split(",")
        .map((s: string) => s.replace(/"/g, "").trim().toLowerCase())
        .filter(Boolean);
    }
    return v.map((s: string) => String(s).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) {
        return parsed.map((s: string) => String(s).trim().toLowerCase()).filter(Boolean);
      }
    } catch {
      // fall through if not valid JSON
    }
    return v
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
};

// Convert a Prisma row → UIDish
function toUIDish(row: {
  id: string;
  name: string;
  category: string;
  tags: any;
  allergens: any;
  costBand: number;
  timeBand: number;
  isHealthy: boolean;
  ytQuery: string | null;
}): UIDish {
  const tags = parseArrayField(row.tags);
  const allergens = parseArrayField(row.allergens);

  return {
    id: row.id,
    name: row.name,
    category: row.category, // already "breakfast" | "lunch" | ...
    tags,
    allergens,
    costBand: row.costBand,
    timeBand: row.timeBand,
    isHealthy: row.isHealthy,
    ytQuery: row.ytQuery ?? "",
  };
}

export async function dishes(
  category: string,
  tags: string[] = [],
  allergens: string[] = []
): Promise<UIDish[]> {
  if (!category) return [];

  const canonicalCategory = category.toLowerCase().trim();

  const where: Prisma.DishWhereInput = {
    category: {
      equals: canonicalCategory,
      mode: "insensitive",
    },
  };

  const rows = await prisma.dish.findMany({
    where,
    orderBy: [{ name: "asc" }],
  });

  console.log("[dishes] category=", canonicalCategory, "rows=", rows.length);

  if (rows.length === 0) {
    console.warn("[dishes] No DB dishes for category:", canonicalCategory);
    return [];
  }

  const norm = (s: string) => s.trim().toLowerCase();
  const selectedTags = (tags ?? []).map(norm);
  const excludedAllergens = (allergens ?? []).map(norm);

  const filtered = rows.filter((r) => {
    const rTags = parseArrayField(r.tags);
    const rAllergens = parseArrayField(r.allergens);

    const tagsOk =
      selectedTags.length === 0 ||
      selectedTags.every((t) => rTags.includes(t));

    const allergensOk =
      excludedAllergens.length === 0 ||
      rAllergens.every((a) => !excludedAllergens.includes(a));

    return tagsOk && allergensOk;
  });

  return filtered.map(toUIDish);
}

// Fetch all dishes from the DB (used by recipe route, etc.)
export async function getAllDishes(): Promise<UIDish[]> {
  const rows = await prisma.dish.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return rows.map(toUIDish);
}