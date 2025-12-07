import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/user/create
 * ---------------------------------------------------
 * Creates or updates a user record tied to an external auth provider.
 *
 * Responsibilities:
 * - Validate presence of auth_id.
 * - Upsert a user based on auth_id.
 * - Sync display name into the public User table.
 * - Initialize allergens and savedMeals for new users.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auth_id, displayName } = body;

    console.log(
      `API /api/user/create: received request for auth_id=${auth_id}, displayName=${displayName}`
    );

    // auth_id is required to associate the user with an external identity
    if (!auth_id) {
      console.error("API /api/user/create: auth_id is missing");
      return NextResponse.json(
        { error: "auth_id is required" },
        { status: 400 }
      );
    }

    console.log(
      `API /api/user/create: upserting user with auth_id=${auth_id}`
    );

    // Upsert ensures idempotent creation/update on repeated logins
    const user = await prisma.user.upsert({
      where: { auth_id },
      update: { name: displayName ?? "User" },
      create: {
        id: crypto.randomUUID(),
        auth_id,
        name: displayName ?? "User",
        allergens: [],
        savedMeals: [],
      },
    });

    console.log(
      `API /api/user/create: success! User ${user.id} created/updated for auth_id=${auth_id}`
    );

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("API /api/user/create: error occurred:", error);
    return NextResponse.json(
      { error: "Failed to create user", details: String(error) },
      { status: 500 }
    );
  }
}
