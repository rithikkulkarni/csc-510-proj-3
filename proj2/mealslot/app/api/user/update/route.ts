// src/app/api/user/update/route.ts
import { NextResponse } from "next/server";
import { updateUserDetails } from "@/app/actions";

/**
 * POST /api/user/update
 * ---------------------------------------------------
 * Updates basic user profile fields.
 *
 * Responsibilities:
 * - Validate required input fields.
 * - Normalize user-provided name.
 * - Persist updates via the centralized user update action.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, name } = body;

    // Ensure a valid user identifier is provided
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Validate name input
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Trim and persist the updated name
    const updatedUser = await updateUserDetails(userId, {
      name: name.trim(),
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error("Update user error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
