"use client";

import { useState, useEffect } from "react";
import { useUser } from "../app/context/UserContext";
import { cn } from "@/components/ui/cn";
import { categoryPillBase } from "@/components/ui/style";

type FilterMenuProps = {
  data: {
    allergens: string[];
    categories: string[]; // still allowed but no longer rendered
  };
  onAllergenChange: (selected: string[]) => void;
  onCategoryChange: (selected: string[]) => void;
};

export default function FilterMenu({
  data,
  onAllergenChange,
  onCategoryChange: _onCategoryChange, // unused on purpose
}: FilterMenuProps) {
  const { user } = useUser();

  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

  // Initialize selections based on user preferences and available allergens
  useEffect(() => {
    if (!data.allergens || data.allergens.length === 0) return;

    const userAllergens = user?.allergens ?? [];
    const validAllergens = data.allergens.filter((a) =>
      userAllergens.includes(a),
    );

    setSelectedAllergens(validAllergens);
    onAllergenChange(validAllergens);
  }, [user, data.allergens, onAllergenChange]);

  const toggleAllergen = (allergen: string) => {
    const updated = selectedAllergens.includes(allergen)
      ? selectedAllergens.filter((a) => a !== allergen)
      : [...selectedAllergens, allergen];

    setSelectedAllergens(updated);
    onAllergenChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Allergens only */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
          Allergens
        </h4>
        <div className="mt-2 flex flex-wrap gap-2">
          {data.allergens.map((allergen) => {
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
                    ? "border-transparent bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm hover:shadow-md"
                    : "border-neutral-200 bg-white/90 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900",
                )}
              >
                {allergen.replace("_", " ")}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
