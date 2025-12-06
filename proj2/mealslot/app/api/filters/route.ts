// app/api/filters/route.ts
import "server-only";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
	try {
		// Fetch tags and allergens from all dishes
		const dishes = await prisma.dish.findMany({
			select: { tags: true, allergens: true },
		});

		// Flatten CSV arrays and get unique values
        const allTags = Array.from(
            new Set(
                dishes.flatMap(d => {
                    if (!d.tags) return [];
                    try {
                        // parse JSON array
                        const parsed = JSON.parse(d.tags);
                        if (Array.isArray(parsed)) return parsed;
                        return [];
                    } catch {
                        // fallback if it's just CSV string
                        return d.tags.split(",").map(s => s.trim());
                    }
                })
            )
        ).filter(Boolean);

        // Normalize allergens using the same logic as lib/allergens.ts
        const aliases: Record<string, string> = {
            'tree-nut': 'nuts',
            'tree_nut': 'nuts',
            'treenut': 'nuts',
            'tree nut': 'nuts',
        };

        const normalizeAllergen = (str: string): string => {
            let normalized = str
                .replace(/[\{\}\[\]"']/g, '') // Remove brackets and quotes
                .trim()
                .toLowerCase();
            
            // Apply alias mapping
            return aliases[normalized] || normalized;
        };

        const allergenSet = new Set<string>();
        
        dishes.forEach(d => {
            if (!d.allergens) return;
            let items: string[] = [];
            try {
                const parsed = JSON.parse(d.allergens);
                if (Array.isArray(parsed)) items = parsed;
            } catch {
                items = d.allergens.split(",").map(s => s.trim());
            }
            
            items.forEach(item => {
                if (!item) return;
                const normalized = normalizeAllergen(item);
                if (normalized) {
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
