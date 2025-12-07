// app/api/filters/route.ts
import "server-only";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/filters
 * ---------------------------------------------------
 * Aggregates all unique tags and allergens from dishes.
 *
 * Responsibilities:
 * - Read tags and allergens from every dish.
 * - Normalize and deduplicate tag and allergen values.
 * - Handle both JSON-array and CSV string storage formats.
 * - Return a consolidated filter set for the UI.
 */
export async function GET(req: NextRequest) {
  try {
    // Fetch tags and allergens from all dishes (minimal projection)
    const dishes = await prisma.dish.findMany({
      select: { tags: true, allergens: true },
    });

    // Flatten tag arrays and get unique tag values
    const allTags = Array.from(
      new Set(
        dishes.flatMap((d) => {
          if (!d.tags) return [];
          try {
            // Preferred: tags stored as a JSON array
            const parsed = JSON.parse(d.tags);
            if (Array.isArray(parsed)) return parsed;
            return [];
          } catch {
            // Fallback: tags stored as a simple CSV string
            return d.tags.split(",").map((s) => s.trim());
          }
        })
      )
    ).filter(Boolean);

    // Normalize allergens using the same logic as lib/allergens.ts
    const aliases: Record<string, string> = {
      "tree-nut": "nuts",
      "tree_nut": "nuts",
      treenut: "nuts",
      "tree nut": "nuts",
    };

    const normalizeAllergen = (str: string): string => {
      const normalized = str
        .replace(/[{}[\]"']/g, "") // Remove brackets and quotes
        .trim()
        .toLowerCase();

      // Apply alias mapping for canonical names
      return aliases[normalized] || normalized;
    };

    const allergenSet = new Set<string>();

    dishes.forEach((d) => {
      if (!d.allergens) return;
      let items: string[] = [];

      try {
        // Preferred: allergens stored as JSON array
        const parsed = JSON.parse(d.allergens);
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        // Fallback: allergens stored as CSV
        items = d.allergens.split(",").map((s) => s.trim());
      }

      items.forEach((item) => {
        if (!item) return;
        const normalized = normalizeAllergen(item);

        // Filter out invalid entries like "[object object]" or "object"
        if (normalized && !normalized.includes("object")) {
          allergenSet.add(normalized);
        }
      });
    });

    const allAllergens = Array.from(allergenSet).sort();

    return Response.json({ tags: allTags, allergens: allAllergens });
  } catch (err) {
    console.error("Failed to fetch filters:", err);
    return Response.json({ tags: [], allergens: [] }, { status: 500 });
  }
}
