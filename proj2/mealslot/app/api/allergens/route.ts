import "server-only";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getAllAllergens } from "@/app/actions";
import { ALLERGEN_OPTIONS } from "@/lib/party";

export async function GET(_req: NextRequest) {
    try {
        const list = await getAllAllergens();
        const unique = Array.from(new Set([...(list || []), ...ALLERGEN_OPTIONS])).filter(Boolean);
        unique.sort((a, b) => a.localeCompare(b));
        return Response.json({ allergens: unique });
    } catch (e) {
        console.error("/api/allergens", e);
        // Fallback to static list on error
        return Response.json({ allergens: ALLERGEN_OPTIONS }, { status: 200 });
    }
}
