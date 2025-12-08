"use client";

import { useEffect, useState } from "react";
import { AccountSettings } from "@stackframe/stack";
import { client } from "@/stack/client";
import { updateUserDetails } from "@/app/actions";
import { useUser } from "@/app/context/UserContext";
import DietaryPreferencesSection from "./DietaryPreferencesSection";

/**
 * AccountPage
 * ---------------------------------------------------
 * Wrapper around Stack's <AccountSettings> that:
 * - Periodically syncs the authenticated user's display name
 *   from Stack Auth to the application's public.User table.
 * - Injects an extra "Dietary Preferences" panel into the
 *   account settings UI.
 */
export default function AccountPage() {
    const { refreshUser } = useUser();
    const [lastSyncedName, setLastSyncedName] = useState<string | null>(null);

    /**
     * Periodically sync Stack Auth profile name into our DB.
     * - Polls Stack client for the current user every 2 seconds.
     * - Only calls updateUserDetails when the displayName changes.
     * - Refreshes UserContext to update the displayed name in header.
     */
    useEffect(() => {
        const syncUserName = async () => {
            try {
                const user = await client.getUser();
                if (!user?.displayName) return;

                // Avoid redundant updates if the name hasn't changed
                if (user.displayName === lastSyncedName) return;

                await updateUserDetails(user.id, { name: user.displayName });
                setLastSyncedName(user.displayName);
                await refreshUser(); // Update UserContext to reflect name change in header
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
    }, [lastSyncedName, refreshUser]);

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
