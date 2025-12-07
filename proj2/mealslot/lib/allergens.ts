/**
 * Allergen normalization helpers
 *
 * Utilities for cleaning and standardizing allergen strings coming from
 * various sources (arrays, JSON-encoded strings, comma-delimited values).
 * Ensures downstream code can rely on a consistent, lowercased format.
 */

/**
 * normalizeAllergens
 *
 * Normalizes a flexible allergen input into a deduplicated string array.
 * Supports:
 * - null/undefined (returns [])
 * - arrays of strings
 * - comma-separated strings
 * - JSON-encoded arrays (e.g. '["dairy","gluten"]')
 * Also applies simple alias mappings (e.g. "tree-nut" → "nuts").
 */
export function normalizeAllergens(input: string | string[] | null | undefined): string[] {
    if (!input) return [];
    const out: string[] = [];

    // Allergen aliases - map variations to standard form
    const aliases: Record<string, string> = {
        'tree-nut': 'nuts',
        'tree_nut': 'nuts',
        'treenut': 'nuts',
        'tree nut': 'nuts',
    };

    const push = (s: string) => {
        let v = (s ?? "")
            .toString()
            .replace(/[{}[\]"']/g, '') // Remove brackets and quotes
            .trim()
            .toLowerCase();
        if (!v) return;

        // Apply alias mapping
        v = aliases[v] || v;

        out.push(v);
    };

    if (Array.isArray(input)) {
        for (const item of input) {
            if (!item) continue;
            // if item looks like a JSON array string, try to parse
            if (typeof item === "string" && item.startsWith("[")) {
                try {
                    const parsed = JSON.parse(item);
                    if (Array.isArray(parsed)) {
                        parsed.forEach((p) => push(String(p)));
                        continue;
                    }
                } catch { }
            }
            // comma-separated values inside array element
            if (typeof item === "string" && item.includes(",")) {
                item.split(",").forEach((p) => push(p));
            } else {
                push(String(item));
            }
        }
        return Array.from(new Set(out.map(s => s.trim())));
    }

    if (typeof input === "string") {
        // try JSON parse (e.g., '["dairy","gluten"]')
        try {
            const parsed = JSON.parse(input);
            if (Array.isArray(parsed)) {
                parsed.forEach((p) => push(String(p)));
                return Array.from(new Set(out.map(s => s.trim())));
            }
        } catch { }
        input.split(",").forEach((p) => push(p));
        return Array.from(new Set(out.map(s => s.trim())));
    }

    return [];
}
