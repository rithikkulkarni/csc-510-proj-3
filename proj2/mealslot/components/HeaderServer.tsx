// app/components/HeaderServer.tsx
import HeaderClient from "./HeaderClient";
import { client } from "@/stack/client";
import { getUserDetails, ensureUserInDB } from "../app/actions";

export default async function HeaderServer() {
    try {
        // Get authenticated Neon user
        const neonUser = await client.getUser();

        if (neonUser) {
            // 🔥 Step 3: ensure a row exists in public.User
            await ensureUserInDB(neonUser);

            // Optionally preload app-specific user details
            await getUserDetails(neonUser.id);
        }
    } catch (err) {
        console.error("Failed to load user for HeaderServer", err);
    }

    // Render client side header which uses UserContext
    return <HeaderClient />;
}
