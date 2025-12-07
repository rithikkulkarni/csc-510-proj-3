import "server-only";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { z } from "zod";
import { PrefsSchema, mergeConstraints } from "@/lib/party";
import { prisma } from "@/lib/db";

/**
 * Request body schema for updating party member preferences.
 * - partyId: ID of the party
 * - memberId: ID of the partyMember being updated
 * - prefs: full preferences object for that member
 */
const Body = z.object({
  partyId: z.string(),
  memberId: z.string(),
  prefs: PrefsSchema,
});

/**
 * POST /api/party/update
 * ---------------------------------------------------
 * Updates a single member's preferences and recomputes
 * merged party constraints across all members.
 *
 * Responsibilities:
 * - Validate incoming preferences for one member.
 * - Persist that member's prefsJson.
 * - Reload all members' prefs for the party.
 * - Use mergeConstraints to compute global constraints,
 *   conflict state, and suggestions.
 * - Store the merged constraints on the party record.
 */
export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return Response.json({ issues: parsed.error.issues }, { status: 400 });
    }

    // Update the member's persisted preferences
    await prisma.partyMember.update({
      where: { id: parsed.data.memberId },
      data: { prefsJson: JSON.stringify(parsed.data.prefs) },
    });

    // Recompute merged constraints based on all party members
    const members = await prisma.partyMember.findMany({
      where: { partyId: parsed.data.partyId },
    });

    const prefsList = members.map((m) => {
      try {
        return PrefsSchema.parse(JSON.parse(m.prefsJson));
      } catch {
        // If parsing fails, fall back to an empty prefs object
        return {};
      }
    });

    const { merged, conflict, suggestions } = mergeConstraints(prefsList);

    await prisma.party.update({
      where: { id: parsed.data.partyId },
      data: { constraintsJson: JSON.stringify(merged) },
    });

    return Response.json({ merged, conflict, suggestions });
  } catch (e) {
    console.error("/api/party/update", e);
    return Response.json({ code: "INTERNAL" }, { status: 500 });
  }
}
