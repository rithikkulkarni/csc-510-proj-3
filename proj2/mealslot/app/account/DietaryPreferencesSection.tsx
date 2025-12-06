"use client";

import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { updateUserDetails, getAllAllergens } from "../actions";

export default function DietaryPreferencesSection() {
    const { user, setUser } = useUser();
    const [preferences, setPreferences] = useState<string[]>([]);
    const [allergens, setAllergens] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    // Load all allergens and user's current selections
    useEffect(() => {
        async function fetchData() {
            const all = await getAllAllergens();
            setAllergens(all);

            const userAllergens = user?.allergens ?? [];
            const validPrefs = all.filter(a => userAllergens.includes(a));
            setPreferences(validPrefs);
        }
        fetchData();
    }, [user]);

    // Toggle selection locally
    const togglePreference = (allergen: string) => {
        setPreferences(prev =>
            prev.includes(allergen)
                ? prev.filter(a => a !== allergen)
                : [...prev, allergen]
        );
        setMessage(""); // reset message
    };

    // Save all changes to DB
    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        setMessage("");
        try {
            await updateUserDetails(user.id, { allergens: preferences });

            // Update UserContext
            setUser({
                ...user,
                allergens: preferences,
            });

            setMessage("Preferences saved successfully!");
        } catch (err) {
            console.error("Failed to save preferences:", err);
            setMessage("Failed to save preferences.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-3">

            <div className="flex flex-wrap gap-2">
                {allergens.map(allergen => {
                    const active = preferences.includes(allergen);
                    return (
                        <button
                            key={allergen}
                            type="button"
                            onClick={() => togglePreference(allergen)}
                            className={`px-3 py-1 rounded border ${active
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700"
                                }`}
                        >
                            {allergen} {active && "✓"}
                        </button>
                    );
                })}
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
                {preferences.length
                    ? `Selected: ${preferences.join(", ")}`
                    : "No allergens selected."}
            </p>

            <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
                {saving ? "Saving..." : "Save All"}
            </button>

            {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
        </div>
    );
}
