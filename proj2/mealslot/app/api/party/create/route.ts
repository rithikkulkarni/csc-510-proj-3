import "server-only";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { z } from "zod";
import { partyCodeFromSeed, PrefsSchema } from "@/lib/party";
import { prisma } from "@/lib/db";

/**
 * Request body schema for creating a new party.
 * - nickname: optional display name for the host
 * - auth_id: optional external auth identifier to link to a user record
 */
const Body = z.object({
  nickname: z.string().min(1).max(24).optional(),
  auth_id: z.string().optional(),
});

/**
 * POST /api/party/create
 * ---------------------------------------------------
 * Creates a new party and registers the requesting user as the host.
 *
 * Responsibilities:
 * - Validate basic host metadata (nickname, auth_id).
 * - Generate a unique party code and active party record.
 * - If auth_id is provided, load user allergens and link the user to the party.
 * - Create an initial partyMember record with host preferences.
 */
export async function POST(req: NextRequest) {
  try {
    const json = (await req.json().catch(() => ({}))) as unknown;
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return Response.json({ issues: parsed.error.issues }, { status: 400 });
    }

    // Generate a party code from a time + randomness seed
    const code = partyCodeFromSeed(`${Date.now()}|${Math.random()}`);

    // Create the party with an empty constraints object by default
    const party = await prisma.party.create({
      data: {
        code,
        isActive: true,
        constraintsJson: JSON.stringify({}),
      },
    });

    // Optionally pull user-level allergens if auth_id is provided
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

    // Register the host as a party member with initial preferences
    const member = await prisma.partyMember.create({
      data: {
        partyId: party.id,
        userId: userId,
        prefsJson: JSON.stringify({
          nickname: parsed.data.nickname ?? "Host",
          allergens: userAllergens,
        }),
      },
    });

    return Response.json({
      code,
      partyId: party.id,
      memberId: member.id,
      host: true,
    });
  } catch (e) {
    console.error("/api/party/create", e);
    return Response.json({ code: "INTERNAL" }, { status: 500 });
  }
}
