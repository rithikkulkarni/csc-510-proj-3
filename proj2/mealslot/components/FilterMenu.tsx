// --- path: components/FilterMenu.tsx ---

/**
 * FilterMenu
 * ------------------------------------------------------------
 * Client-side filter selection component for dish spins.
 *
 * Responsibilities:
 * - Displays selectable allergen (and optionally tag) filters.
 * - Fetches available filters from `/api/filters` if not provided via props.
 * - Initializes allergen selections based on the current user’s preferences.
 * - Emits updates upward via `onTagChange` and `onAllergenChange` callbacks.
 *
 * Intended usage:
 * - Used on the main spin page to constrain dish selection.
 * - Can be controlled externally (via `data` prop) or self-fetching.
 */

"use client";

import { useState, useEffect } from "react";
import { useUser } from "../app/context/UserContext";
import { cn } from "./ui/cn";
import { categoryPillBase } from "./ui/style";

type FilterMenuProps = {
  /** Optional preloaded filter data (primarily for tests or server-provided data) */
  data?: {
    tags?: string[];
    allergens?: string[];
  };
  /** Callback fired when selected tags change */
  onTagChange?: (selected: string[]) => void;
  /** Callback fired when selected allergens change */
  onAllergenChange?: (selected: string[]) => void;
};

export default function FilterMenu({
  data,
  onTagChange = () => {},
  onAllergenChange = () => {},
}: FilterMenuProps) {
  const { user } = useUser();

  // Available filter options
  const [tags, setTags] = useState<string[]>(data?.tags ?? []);
  const [allergens, setAllergens] = useState<string[]>(data?.allergens ?? []);

  // User-selected filters
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

  /**
   * Fetch available filters from the API when `data` is not provided.
   * The cleanup guard prevents state updates after unmount.
   */
  useEffect(() => {
    if (data) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/filters");
        if (!res.ok) throw new Error("bad response");
        const json = await res.json();
        if (cancelled) return;
        setTags(json.tags ?? []);
        setAllergens(json.allergens ?? []);
      } catch (err) {
        console.error("FilterMenu: Failed to fetch filters:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data]);

  /**
   * Initialize selected allergens based on the current user's preferences,
   * constrained to allergens that actually exist in the filter options.
   */
  useEffect(() => {
    if (!allergens || allergens.length === 0) return;

    const userAllergens = user?.allergens ?? [];
    const validAllergens = allergens.filter((a) => userAllergens.includes(a));
    setSelectedAllergens(validAllergens);
    onAllergenChange(validAllergens);
  }, [user, JSON.stringify(allergens), onAllergenChange]);

  // Toggle a single allergen selection
  const toggleAllergen = (allergen: string) => {
    const updated = selectedAllergens.includes(allergen)
      ? selectedAllergens.filter((a) => a !== allergen)
      : [...selectedAllergens, allergen];

    setSelectedAllergens(updated);
    onAllergenChange(updated);
  };

  // Toggle a single tag selection
  const toggleTag = (tag: string) => {
    const updated = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];

    setSelectedTags(updated);
    onTagChange(updated);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Allergens</h3>
      <div className="flex flex-wrap gap-2">
        {allergens.length === 0 ? (
          <p className="text-sm text-gray-500">Loading allergens...</p>
        ) : (
          allergens.map((allergen) => {
            const active = selectedAllergens.includes(allergen);
            return (
              <button
                key={allergen}
                type="button"
                aria-pressed={active}
                onClick={() => toggleAllergen(allergen)}
                className={cn(
                  categoryPillBase,
                  active
                    ? "border-transparent bg-gradient-to-r from-brand-coral to-brand-gold text-brand-dusk shadow-glow"
                    : "text-brand-dusk hover:text-brand-dusk hover:border-brand-gold/80 dark:text-white/80 dark:hover:text-white"
                )}
              >
                {allergen}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
