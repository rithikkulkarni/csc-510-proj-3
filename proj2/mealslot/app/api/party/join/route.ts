import "server-only";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { z } from "zod";
import { PrefsSchema } from "@/lib/party";
import { prisma } from "@/lib/db";

/**
 * Request body schema for joining an existing party.
 * - code: 6-character party code
 * - nickname: optional display name for the joining user
 * - auth_id: optional external auth identifier to link to a user record
 */
const Body = z.object({
  code: z.string().length(6),
  nickname: z.string().min(1).max(24).optional(),
  auth_id: z.string().optional(),
});

/**
 * POST /api/party/join
 * ---------------------------------------------------
 * Adds a new member to an existing, active party.
 *
 * Responsibilities:
 * - Validate the party code and user metadata.
 * - Look up the active party by code.
 * - If auth_id is provided, load user allergens and link the user to the party.
 * - Create a partyMember record with the user's preferences.
 */
export async function POST(req: NextRequest) {
  try {
    const json = (await req.json().catch(() => ({}))) as unknown;
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return Response.json({ issues: parsed.error.issues }, { status: 400 });
    }

    // Find an active party with the given code
    const party = await prisma.party.findFirst({
      where: { code: parsed.data.code, isActive: true },
    });
    if (!party) {
      return Response.json({ code: "NOT_FOUND" }, { status: 404 });
    }

    // Get user allergens and ID if auth_id is provided
    let userAllergens: string[] = [];
    let userId: string | undefined;

    if (parsed.data.auth_id) {
      const user = await prisma.user.findUnique({
        where: { auth_id: parsed.data.auth_id },
      });
      if (user) {
        userAllergens = user.allergens ?? [];
        userId = user.id;
      }
    }

    // Register the joining user as a party member
    const member = await prisma.partyMember.create({
      data: {
        partyId: party.id,
        userId: userId,
        prefsJson: JSON.stringify({
          nickname: parsed.data.nickname ?? "Guest",
          allergens: userAllergens,
        }),
      },
    });

    return Response.json({
      partyId: party.id,
      memberId: member.id,
      code: party.code,
    });
  } catch (e) {
    console.error("/api/party/join", e);
    return Response.json({ code: "INTERNAL" }, { status: 500 });
  }
}
