"use client";

import { useEffect, useState } from "react";
import { AccountSettings } from "@stackframe/stack";
import { server } from "@/stack/server";
import { client } from "@/stack/client";
import { updateUserDetails } from "@/app/actions";
import Link from "next/link";
import DietaryPreferencesSection from "./DietaryPreferencesSection";

// -------------------------
// Main Account Page
// -------------------------
export default function AccountPage() {
    const [lastSyncedName, setLastSyncedName] = useState<string | null>(null);

    // Sync Stack Auth profile updates to public.User
    useEffect(() => {
        const syncUserName = async () => {
            try {
                const user = await client.getUser();
                if (!user?.displayName) return;

                // Only sync if name changed since last sync
                if (user.displayName === lastSyncedName) return;

                await updateUserDetails(user.id, { name: user.displayName });
                setLastSyncedName(user.displayName);
                console.log(`Synced user name to DB: ${user.displayName}`);
            } catch (err) {
                console.error("Failed to sync user name:", err);
            }
        };

        // Check for profile updates every 2 seconds
        const interval = setInterval(syncUserName, 2000);
        // Also sync on initial load
        syncUserName();

        return () => clearInterval(interval);
    }, [lastSyncedName]);

    return (
        <AccountSettings
            fullPage={true}
            extraItems={[
                {
                    id: "dietary-preferences",
                    title: "Dietary Preferences",
                    content: <DietaryPreferencesSection />,
                    iconName: "Settings",
                },
            ]}
        />
    );
}
