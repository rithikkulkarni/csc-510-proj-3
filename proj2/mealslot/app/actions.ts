'use server';

import { prisma } from "@/lib/db";
import { client } from "@/lib/neon";

// -------------------------------------
// Fetch all allergens that exist in dishes
// -------------------------------------
export async function getAllAllergens(): Promise<string[]> {
  const dishes = await prisma.dish.findMany({
    select: { allergens: true },
  });

  const allAllergens = Array.from(
    new Set(
      dishes.flatMap(d => {
        if (!d.allergens) return [];
        try {
          const parsed = JSON.parse(d.allergens);
          if (Array.isArray(parsed)) return parsed;
          return [];
        } catch {
          return d.allergens.split(",").map(s => s.trim());
        }
      })
    )
  ).filter(Boolean);

  return allAllergens;
}

// -------------------------------------
// Get user details
// Pulls profile + allergens from public.User
// and auth metadata from neon_auth.users_sync
// -------------------------------------
export async function getUserDetails(userId: string | undefined) {
  if (!userId) return null;

  // Lookup the public user by auth_id
  const user = await prisma.user.findUnique({
    where: { auth_id: userId },
  });

  if (!user) {
    console.warn("No matching user row found for auth_id", userId);
    return null;
  }

  // Lookup neon auth metadata (email, created_at, etc.)
  const authRows = await client.query(
    `SELECT * FROM neon_auth.users_sync WHERE id = $1`,
    [userId]
  );

  const auth = authRows[0] ?? null;
  const allAllergens = await getAllAllergens();

  return {
    id: user.id,
    auth_id: user.auth_id,
    name: user.name,
    email: auth?.email ?? null,
    allergens: user.allergens ?? [],
    savedMeals: user.savedMeals ?? [],
    allAllergens,
  };
}

// -------------------------------------
// Update user details
// Writes allergens and savedMeals into public.User
// -------------------------------------
export async function updateUserDetails(
  userId: string | undefined,
  data: {
    name?: string;
    allergens?: string[];
    savedMeals?: string[];
  }
) {
  if (!userId) throw new Error("User ID is required");

  const updated = await prisma.user.update({
    where: { auth_id: userId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.allergens && { allergens: data.allergens }),
      ...(data.savedMeals && { savedMeals: data.savedMeals }),
    },
  });

  return getUserDetails(userId);
}

// -------------------------------------
// Ensure a user exists in the public.User table
// -------------------------------------
export async function ensureUserInDB(authUser: { id: string; display_name?: string }) {
  if (!authUser?.id) return null;

  return prisma.user.upsert({
    where: { auth_id: authUser.id },
    update: {}, // nothing to update on existing user
    create: {
      id: crypto.randomUUID(),
      auth_id: authUser.id,
      name: authUser.display_name || "User",
      allergens: [],
      savedMeals: [],
    },
  });
}
