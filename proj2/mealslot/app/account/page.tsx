"use client";

import { AccountSettings } from "@stackframe/stack";
import Link from "next/link";
import DietaryPreferencesSection from "./DietaryPreferencesSection";

// -------------------------
// Main Account Page
// -------------------------
export default function AccountPage() {
    return (
        <AccountSettings
            fullPage={true}
            extraItems={[
                {
                    id: "dietary-preferences",
                    title: "Dietary Preferences",
                    content: <DietaryPreferencesSection />, // render inline, not as a link
                    iconName: "Settings", // optional
                },
            ]}

        />
    );
}
