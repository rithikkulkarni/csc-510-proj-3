"use client";

import { useState, useEffect } from "react";
import { useUser } from "../app/context/UserContext";

type FilterMenuProps = {
  data: {
    allergens: string[];
    categories: string[];
  };
  onAllergenChange: (selected: string[]) => void;
  onCategoryChange: (selected: string[]) => void;
};

export default function FilterMenu({
  data,
  onAllergenChange,
  onCategoryChange,
}: FilterMenuProps) {
  const { user } = useUser();

  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Initialize selections based on user preferences and available options
  useEffect(() => {
    if (!data.allergens || data.allergens.length === 0) return;

    // User allergens intersected with available allergens
    const userAllergens = user?.allergens ?? [];
    const validAllergens = data.allergens.filter(a => userAllergens.includes(a));
    setSelectedAllergens(validAllergens);
    onAllergenChange(validAllergens);

    // Optionally initialize categories if you have a user preference for tags
    // setSelectedCategories(data.categories); // Uncomment if needed
  }, [user, data.allergens, onAllergenChange]);

  const toggleAllergen = (allergen: string) => {
    const updated = selectedAllergens.includes(allergen)
      ? selectedAllergens.filter(a => a !== allergen)
      : [...selectedAllergens, allergen];

    setSelectedAllergens(updated);
    onAllergenChange(updated);
  };

  const toggleCategory = (category: string) => {
    const updated = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];

    setSelectedCategories(updated);
    onCategoryChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Allergens */}
      <div>
        <h4 className="font-semibold">Allergens</h4>
        <div className="flex flex-wrap gap-2">
          {data.allergens.map(allergen => {
            const active = selectedAllergens.includes(allergen);
            return (
              <button
                key={allergen}
                type="button"
                aria-pressed={active}
                onClick={() => toggleAllergen(allergen)}
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
      </div>

      {/* Categories */}
      <div>
        <h4 className="font-semibold">Categories</h4>
        <div className="flex flex-wrap gap-2">
          {data.categories.map(category => {
            const active = selectedCategories.includes(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={() => toggleCategory(category)}
                className={`px-3 py-1 rounded border ${active
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700"
                  }`}
              >
                {category} {active && "✓"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
