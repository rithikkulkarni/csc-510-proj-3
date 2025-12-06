'use server';

import { prisma } from '@/lib/db';

export type NeonUser = {
  id: string;
  displayName?: string | null;
  email?: string | null;
};

// -------------------------
// Fetch all allergens
// -------------------------
export async function getAllAllergens(): Promise<string[]> {
  const dishes = await prisma.dish.findMany({ select: { allergens: true } });
  const normalize = (raw: string): string[] => {
    if (!raw) return [];
    const cleaned = raw.replaceAll("{", "").replaceAll("}", "").replaceAll("[", "").replaceAll("]", "").replaceAll('"', "");
    const aliases: Record<string, string> = {
      tree_nut: "nuts",
      "tree-nut": "nuts"
    };
    return cleaned
      .split(/[,;\n]/)
      .map(s => s.trim())
      .flatMap(s => s.split(/\s+/))
      .map(s => s.replace(/[-]/g, "_").toLowerCase())
      .map(s => s.replace(/[^a-z0-9_]/g, ""))
      .map(s => aliases[s] ?? s)
      .filter(Boolean);
  };

  const merged = dishes.flatMap(d => {
    if (!d.allergens) return [] as string[];
    try {
      const parsed = JSON.parse(d.allergens);
      if (Array.isArray(parsed)) {
        return parsed.flatMap(v => normalize(String(v)));
      }
      return normalize(String(parsed));
    } catch {
      return normalize(d.allergens);
    }
  });

  return Array.from(new Set(merged)).filter(Boolean);
}

// -------------------------
// Get user details
// -------------------------
export async function getUserDetails(userId?: string) {
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { auth_id: userId } });
  if (!user) return null;

  const allAllergens = await getAllAllergens();

  return {
    id: user.id,
    auth_id: user.auth_id,
    name: user.name,
    allergens: user.allergens ?? [],
    savedMeals: user.savedMeals ?? [],
    allAllergens,
  };
}

// -------------------------
// Update user details
// -------------------------
export async function updateUserDetails(
  userId: string,
  data: { name?: string; allergens?: string[]; savedMeals?: string[] }
) {
  await prisma.user.update({
    where: { auth_id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.allergens !== undefined && { allergens: data.allergens }),
      ...(data.savedMeals !== undefined && { savedMeals: data.savedMeals }),
    },
  });

  return getUserDetails(userId);
}

// -------------------------
// Ensure user exists in public.user
// -------------------------
export async function ensureUserInDB(neonUser: NeonUser | null) {
  if (!neonUser?.id) {
    console.error('ensureUserInDB: no neonUser provided');
    return null;
  }

  console.log(`ensureUserInDB: creating user directly from Stack Auth for id=${neonUser.id}`);

  try {
    const upserted = await prisma.user.upsert({
      where: { auth_id: neonUser.id },
      update: {},
      create: {
        id: crypto.randomUUID(),
        auth_id: neonUser.id,
        name: neonUser.displayName ?? 'User',
        allergens: [],
        savedMeals: [],
      },
    });

    console.log(`ensureUserInDB: public.user created/upserted for auth_id=${neonUser.id}`);
    console.debug(`ensureUserInDB: result ->`, upserted);
    return upserted;
  } catch (err) {
    console.error(`ensureUserInDB: failed to create user for auth_id=${neonUser.id}`, err);
    throw err;
  }
}
