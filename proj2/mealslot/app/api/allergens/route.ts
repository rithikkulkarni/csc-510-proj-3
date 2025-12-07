import "server-only";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getAllAllergens } from "@/app/actions";
import { ALLERGEN_OPTIONS } from "@/lib/party";

/**
 * GET /api/allergens
 * ---------------------------------------------------
 * Returns a normalized list of dietary allergens.
 *
 * Responsibilities:
 * - Fetch dynamically stored allergens from the database.
 * - Merge them with the static fallback allergen list.
 * - Deduplicate and alphabetize the final result.
 * - Gracefully fall back to the static list on error.
 */
export async function GET(_req: NextRequest) {
  try {
    // Fetch allergens from the database (if available)
    const list = await getAllAllergens();

    // Merge DB-provided and static options, remove duplicates, and sort
    const unique = Array.from(
      new Set([...(list || []), ...ALLERGEN_OPTIONS])
    ).filter(Boolean);

    unique.sort((a, b) => a.localeCompare(b));

    return Response.json({ allergens: unique });
  } catch (e) {
    console.error("/api/allergens", e);

    // Fallback to static allergen list if DB access fails
    return Response.json(
      { allergens: ALLERGEN_OPTIONS },
      { status: 200 }
    );
  }
}
