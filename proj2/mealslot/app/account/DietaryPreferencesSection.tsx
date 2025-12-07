"use client";

import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { updateUserDetails, getAllAllergens } from "../actions";

/**
 * DietaryPreferencesSection
 * ---------------------------------------------------
 * UI section that allows a user to view and update their
 * dietary allergen preferences.
 *
 * Responsibilities:
 * - Load all available allergens from the backend.
 * - Initialize selections based on the current user's profile.
 * - Allow local toggling of allergen preferences.
 * - Persist updates to the backend and UserContext.
 */
export default function DietaryPreferencesSection() {
  const { user, setUser } = useUser();

  const [preferences, setPreferences] = useState<string[]>([]); // Selected allergens
  const [allergens, setAllergens] = useState<string[]>([]);     // All available allergens
  const [saving, setSaving] = useState(false);                  // Save-in-progress state
  const [message, setMessage] = useState("");                   // User feedback message

  /**
   * Load all allergens and initialize the user's current selections.
   * Filters user allergens against the global list to avoid invalid values.
   */
  useEffect(() => {
    async function fetchData() {
      const all = await getAllAllergens();
      setAllergens(all);

      const userAllergens = user?.allergens ?? [];
      const validPrefs = all.filter((a) => userAllergens.includes(a));
      setPreferences(validPrefs);
    }

    fetchData();
  }, [user]);

  /**
   * Toggle an allergen in local state only.
   * Does not persist changes until the user explicitly saves.
   */
  const togglePreference = (allergen: string) => {
    setPreferences((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    );
    setMessage(""); // Clear feedback on interaction
  };

  /**
   * Persist allergen preferences to the backend and update UserContext.
   */
  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage("");

    try {
      await updateUserDetails(user.id, { allergens: preferences });

      // Sync updated allergens into global user state
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
      {/* Allergen selection buttons */}
      <div className="flex flex-wrap gap-2">
        {allergens.map((allergen) => {
          const active = preferences.includes(allergen);

          return (
            <button
              key={allergen}
              type="button"
              onClick={() => togglePreference(allergen)}
              className={`px-3 py-1 rounded border ${
                active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700"
              }`}
            >
              {allergen} {active && "✓"}
            </button>
          );
        })}
      </div>

      {/* Summary text */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {preferences.length
          ? `Selected: ${preferences.join(", ")}`
          : "No allergens selected."}
      </p>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        {saving ? "Saving..." : "Save All"}
      </button>

      {/* Feedback message */}
      {message && (
        <p className="text-sm text-green-600 dark:text-green-400">
          {message}
        </p>
      )}
    </div>
  );
}
