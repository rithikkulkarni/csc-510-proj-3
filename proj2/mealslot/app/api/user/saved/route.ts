import "server-only";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
    authId: z.string().min(1),
    savedMeals: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
    const json = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
        return Response.json({ issues: parsed.error.issues }, { status: 400 });
    }

    const { authId, savedMeals } = parsed.data;

    try {
        await prisma.user.update({
            where: { auth_id: authId },
            data: {
                ...(savedMeals !== undefined && { savedMeals }),
            },
        });

        const updated = await prisma.user.findUnique({ where: { auth_id: authId } });
        return Response.json({ savedMeals: updated?.savedMeals ?? [] });
    } catch (err) {
        console.error("Failed to update saved meals", err);
        return Response.json({ message: "Failed to update saved meals" }, { status: 500 });
    }
}