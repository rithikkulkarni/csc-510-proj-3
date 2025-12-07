import "server-only";
export const runtime = "nodejs"; // ensure Prisma runs in Node

import { NextRequest } from "next/server";
import { z } from "zod";
import { dishes } from "@/lib/dishes";
import { Dish, PowerUpsInput } from "@/lib/schemas";
import { weightedSpin } from "@/lib/scoring";
import { prisma } from "@/lib/db";

/**
 * Request body schema for the spin endpoint.
 * Supports both legacy single-category and new per-slot categories.
 */
const Body = z
  .object({
    // Legacy single category (will be expanded across slots if used)
    category: z.string().min(1).optional(),

    // New: explicit category per slot
    categories: z.array(z.string()).optional(),

    tags: z.array(z.string()).optional().default([]),
    allergens: z.array(z.string()).optional().default([]),

    // Locked items: either explicit { index, dishId } or an index value
    locked: z
      .array(
        z.union([
          z.object({
            index: z.number().int().min(0).max(5),
            dishId: z.string(),
          }),
          z.number().int().min(0).max(5),
        ])
      )
      .optional()
      .default([]),

    // Power-up flags to bias scoring
    powerups: z
      .object({
        healthy: z.boolean().optional(),
        cheap: z.boolean().optional(),
        max30m: z.boolean().optional(),
      })
      .optional()
      .default({}),

    // Number of dishes (slots) to select; defaults from categories length
    dishCount: z.number().int().min(1).optional(),
  })
  .passthrough();

/**
 * POST /api/spin
 * ---------------------------------------------------
 * Core spin engine for the meal slot machine.
 *
 * Responsibilities:
 * - Validate spin configuration (categories, tags, allergens, powerups, locks).
 * - Resolve requested categories into per-slot dish reels.
 * - Run weightedSpin to pick a selection, honoring locks and powerups.
 * - Persist spin metadata for analytics (best-effort).
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(raw);

    if (!parsed.success) {
      return Response.json({ issues: parsed.error.issues }, { status: 400 });
    }

    const {
      category,
      categories,
      tags,
      allergens,
      powerups,
      locked,
      dishCount,
    } = parsed.data as {
      category?: string;
      categories?: string[];
      tags: string[];
      allergens: string[];
      powerups: PowerUpsInput;
      locked: Array<number | { index: number; dishId: string }>;
      dishCount?: number;
    };

    // Support both new categories array and legacy single category
    const slotCategories =
      categories && categories.length > 0
        ? categories
        : category
        ? Array(dishCount ?? 1).fill(category)
        : [];

    if (slotCategories.length === 0) {
      return Response.json(
        { message: "category or categories is required" },
        { status: 400 }
      );
    }

    // Normalize locked input down to { index, dishId } entries only
    const lockedInput = (locked ?? []).flatMap((x) => {
      if (typeof x === "number") return [];
      if (x && typeof x === "object" && "index" in x && "dishId" in x) {
        return [x];
      }
      return [];
    }) as Array<{ index: number; dishId: string }>;

    const reels: Dish[][] = [];
    const count = dishCount ?? slotCategories.length;

    // Build a reel (candidate dish list) for each slot
    for (let i = 0; i < count; i++) {
      const slotCategory = slotCategories[i] || slotCategories[0] || "Dinner";
      const allDishes = await dishes(slotCategory, tags, allergens);
      reels.push(allDishes);
    }

    // Compute the final selection using the scoring/weighting engine
    const selection = weightedSpin(reels, lockedInput, powerups);

    // Persist spin metadata for analysis (non-fatal if it fails)
    try {
      await prisma.spin.create({
        data: {
          reelsJson: JSON.stringify(reels.map((r) => r.map((d) => d.id))),
          lockedJson: JSON.stringify(lockedInput),
          resultDishIds: JSON.stringify(selection.map((d) => d.id)),
          powerupsJson: JSON.stringify(powerups),
        },
      });
    } catch (e) {
      console.warn("spin persist failed (non-fatal):", (e as Error).message);
    }

    return Response.json({
      spinId: `spin_${Date.now()}`,
      reels,
      selection,
    });
  } catch (err) {
    console.error("spin route error:", err);
    return Response.json(
      {
        code: "INTERNAL_ERROR",
        message: (err as Error)?.message ?? "unknown",
      },
      { status: 500 }
    );
  }
}
