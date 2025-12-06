import "server-only";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { z } from "zod";
import { partyCodeFromSeed, PrefsSchema } from "@/lib/party";
import { prisma } from "@/lib/db";

const Body = z.object({
  nickname: z.string().min(1).max(24).optional(),
  auth_id: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const json = (await req.json().catch(() => ({}))) as unknown;
    const parsed = Body.safeParse(json);
    if (!parsed.success) return Response.json({ issues: parsed.error.issues }, { status: 400 });

    const code = partyCodeFromSeed(`${Date.now()}|${Math.random()}`);
    const party = await prisma.party.create({
      data: {
        code,
        isActive: true,
        constraintsJson: JSON.stringify({})
      }
    });

    // Get user allergens if auth_id provided
    let userAllergens: string[] = [];
    let userId: string | undefined;
    if (parsed.data.auth_id) {
      const user = await prisma.user.findUnique({ where: { auth_id: parsed.data.auth_id } });
      if (user) {
        userAllergens = user.allergens ?? [];
        userId = user.id;
      }
    }

    const member = await prisma.partyMember.create({
      data: {
        partyId: party.id,
        userId: userId,
        prefsJson: JSON.stringify({
          nickname: parsed.data.nickname ?? "Host",
          allergens: userAllergens
        })
      }
    });

    return Response.json({
      code,
      partyId: party.id,
      memberId: member.id,
      host: true
    });
  } catch (e) {
    console.error("/api/party/create", e);
    return Response.json({ code: "INTERNAL" }, { status: 500 });
  }
}
