"use client";

import { useState, useEffect } from "react";
import { useUser } from "../app/context/UserContext";
import { cn } from "./ui/cn";
import { categoryPillBase } from "./ui/style";

type FilterMenuProps = {
  data?: {
    tags?: string[];
    allergens?: string[];
  };
  onTagChange?: (selected: string[]) => void;
  onAllergenChange?: (selected: string[]) => void;
};

export default function FilterMenu({ data, onTagChange = () => { }, onAllergenChange = () => { } }: FilterMenuProps) {
  const { user } = useUser();

  const [tags, setTags] = useState<string[]>(data?.tags ?? []);
  const [allergens, setAllergens] = useState<string[]>(data?.allergens ?? []);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

  // Fetch filters if no `data` prop was provided (tests mock global.fetch)
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
        console.error("Failed to fetch filters:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data]);

  // Initialize selections based on user preferences and available options
  useEffect(() => {
    if (!allergens || allergens.length === 0) return;

    const userAllergens = user?.allergens ?? [];
    const validAllergens = allergens.filter((a) => userAllergens.includes(a));
    setSelectedAllergens(validAllergens);
    onAllergenChange(validAllergens);
  }, [user, JSON.stringify(allergens), onAllergenChange]);

  const toggleAllergen = (allergen: string) => {
    const updated = selectedAllergens.includes(allergen)
      ? selectedAllergens.filter((a) => a !== allergen)
      : [...selectedAllergens, allergen];

    setSelectedAllergens(updated);
    onAllergenChange(updated);
  };

  const toggleTag = (tag: string) => {
    const updated = selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag];
    setSelectedTags(updated);
    onTagChange(updated);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Filters</h2>

      <details>
        <summary className="font-medium">Tags</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTag(tag)}
                className={cn(
                  categoryPillBase,
                  active
                    ? "bg-neutral-900 border-transparent bg-gradient-to-r from-brand-coral to-brand-gold text-brand-dusk shadow-glow"
                    : "text-brand-dusk hover:text-brand-dusk hover:border-brand-gold/80 dark:text-white/80 dark:hover:text-white"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </details>

      <details>
        <summary className="font-medium">Allergens</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {allergens.map((allergen) => {
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
          })}
        </div>
      </details>
    </div>
  );
}
