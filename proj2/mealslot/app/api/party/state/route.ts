import "server-only";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { z } from "zod";
import { PartyStateSchema, PrefsSchema, ConstraintsSchema } from "@/lib/party";
import { prisma } from "@/lib/db";

/**
 * Query schema for fetching party state.
 * - code: 6-character party code
 */
const Query = z.object({
  code: z.string().length(6),
});

/**
 * GET /api/party/state?code=ABC123
 * ---------------------------------------------------
 * Returns the full state of a party:
 * - Party metadata (id, code, isActive, constraints).
 * - All members with their preferences.
 *
 * Responsibilities:
 * - Validate the query string.
 * - Load party + members from the database.
 * - Parse constraints and prefs JSON with zod schemas.
 * - Hydrate missing member allergens from the linked User record.
 * - Validate the final shape against PartyStateSchema before returning.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parsed = Query.safeParse({ code: url.searchParams.get("code") ?? "" });
    if (!parsed.success) {
      return Response.json({ issues: parsed.error.issues }, { status: 400 });
    }

    const party = await prisma.party.findFirst({
      where: { code: parsed.data.code },
    });
    if (!party) {
      return Response.json({ code: "NOT_FOUND" }, { status: 404 });
    }

    const members = await prisma.partyMember.findMany({
      where: { partyId: party.id },
      include: { user: { select: { allergens: true } } },
    });

    const resp = {
      party: {
        id: party.id,
        code: party.code,
        isActive: party.isActive,
        constraints: (() => {
          try {
            return ConstraintsSchema.parse(JSON.parse(party.constraintsJson));
          } catch {
            // On failure, fall back to an empty constraints object
            return {};
          }
        })(),
      },
      members: members.map((m) => ({
        id: m.id,
        nickname: (() => {
          try {
            const p = JSON.parse(m.prefsJson);
            return typeof p.nickname === "string" ? p.nickname : undefined;
          } catch {
            return undefined;
          }
        })(),
        prefs: (() => {
          try {
            const parsed = PrefsSchema.parse(JSON.parse(m.prefsJson));

            // If prefs are missing allergens but the linked user has them,
            // hydrate from the User table to keep party safety intact.
            if (
              (!parsed.allergens || parsed.allergens.length === 0) &&
              m.user?.allergens?.length
            ) {
              return { ...parsed, allergens: m.user.allergens };
            }
            return parsed;
          } catch {
            // Fallback: still try to surface user allergens if available
            const userAllergens = m.user?.allergens ?? [];
            return userAllergens.length ? { allergens: userAllergens } : {};
          }
        })(),
      })),
    };

    // Validate the assembled party state before sending it to clients
    const validated = PartyStateSchema.parse(resp);
    return Response.json(validated);
  } catch (e) {
    console.error("/api/party/state", e);
    return Response.json({ code: "INTERNAL" }, { status: 500 });
  }
}
