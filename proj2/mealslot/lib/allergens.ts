export function normalizeAllergens(input: string | string[] | null | undefined): string[] {
    if (!input) return [];
    const out: string[] = [];

    const push = (s: string) => {
        const v = (s ?? "").toString().trim();
        if (!v) return;
        // normalize capitalization / spacing as-is but trim
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
