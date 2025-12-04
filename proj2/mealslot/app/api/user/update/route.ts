// src/app/api/user/update/route.ts
import { NextResponse } from "next/server";
import { updateUserDetails } from "@/app/actions";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, name } = body;

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        if (!name || typeof name !== "string" || name.trim() === "") {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const updatedUser = await updateUserDetails(userId, { name: name.trim() });

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (err) {
        console.error("Update user error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
