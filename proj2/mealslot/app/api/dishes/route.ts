import "server-only";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/* ------------------------ utils ------------------------ */
/**
 * Convert a string into a slug suitable for use as an ID.
 * - Lowercases
 * - Replaces non-alphanumeric chars with underscores
 * - Trims leading/trailing underscores
 */
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/* ------------------------ GET /api/dishes?category=... ------------------------ */
/**
 * Query schema for listing dishes.
 * Allows an optional category filter.
 */
const ListQuery = z.object({
  category: z.string().min(1).optional(),
});

/**
 * GET /api/dishes
 * ---------------------------------------------------
 * Returns up to 250 dishes, optionally filtered by category.
 * - Validates query string using ListQuery.
 * - Orders results alphabetically by name.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = ListQuery.safeParse({
    category: searchParams.get("category") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ issues: parsed.error.issues }, { status: 400 });
  }

  const where: Prisma.DishWhereInput =
    parsed.data.category ? { category: parsed.data.category } : {};

  const rows = await prisma.dish.findMany({
    where,
    orderBy: [{ name: "asc" }],
    take: 250,
  });

  return Response.json(rows);
}

/* ------------------------ POST /api/dishes ------------------------ */
/**
 * CreateBody
 * ---------------------------------------------------
 * Schema for creating a new dish.
 * - `id` is optional; will be derived from category + name if omitted.
 * - tags and allergens default to empty arrays.
 */
const CreateBody = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  category: z.string().min(1), // e.g. "main" | "veggie" | "soup" | ...
  tags: z.array(z.string()).optional().default([]),
  allergens: z.array(z.string()).optional().default([]),
  costBand: z.number().int().min(1).max(3),
  timeBand: z.number().int().min(1).max(3),
  isHealthy: z.boolean().optional().default(false),
  ytQuery: z.string().optional().nullable(),
});

/**
 * POST /api/dishes
 * ---------------------------------------------------
 * Creates a new dish.
 * - Validates the request body using CreateBody.
 * - Builds a normalized ID from the provided id or `${category}_${slugifiedName}`.
 * - Rejects the request with 409 if a dish with that ID already exists.
 * - Persists tags and allergens as CSV strings in the database.
 */
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) {
    return Response.json({ issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;

  // Build/normalize ID (limit length for safety)
  const id =
    (data.id && slugify(data.id).slice(0, 50)) ||
    `${data.category}_${slugify(data.name)}`.slice(0, 50);

  // Prevent accidental overwrite of existing dishes
  const exists = await prisma.dish.findUnique({ where: { id } });
  if (exists) {
    return Response.json(
      { code: "ALREADY_EXISTS", message: `Dish with id '${id}' already exists.` },
      { status: 409 }
    );
  }

  const created = await prisma.dish.create({
    data: {
      id,
      name: data.name,
      category: data.category,
      tags: data.tags.join(","),           // stored as CSV in SQLite
      allergens: data.allergens.join(","), // stored as CSV in SQLite
      costBand: data.costBand,
      timeBand: data.timeBand,
      isHealthy: data.isHealthy,
      ytQuery: data.ytQuery ?? null,
    },
  });

  return Response.json(created, { status: 201 });
}
