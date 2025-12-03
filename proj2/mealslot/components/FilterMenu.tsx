"use client";

import React from "react";
import { useEffect, useState } from "react";
import { cn } from "./ui/cn"; // assuming you have your cn helper

type FilterMenuProps = {
  onTagChange: (tags: string[]) => void;
  onAllergenChange: (allergens: string[]) => void;
};

export default function FilterMenu({
  onTagChange,
  onAllergenChange,
}: FilterMenuProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/filters")
      .then((res) => res.json())
      .then((data) => {
        setTags(data.tags ?? []);
        setAllergens(data.allergens ?? []);
      })
      .catch((err) => console.error("Failed to fetch filters:", err));
  }, []);

  const toggleTag = (tag: string) => {
    const updated = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(updated);
    onTagChange(updated);
  };

  const toggleAllergen = (allergen: string) => {
    const updated = selectedAllergens.includes(allergen)
      ? selectedAllergens.filter((a) => a !== allergen)
      : [...selectedAllergens, allergen];
    setSelectedAllergens(updated);
    onAllergenChange(updated);
  };

  const pillBase =
    "rounded-full border px-3 py-1.5 text-xs md:text-sm font-medium transform transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 hover:-translate-y-0.5 hover:scale-[1.05] active:scale-[0.97]";

  return (
    <div className="space-y-3">
      {/* Tags Dropdown */}
      <details className="group rounded-xl border border-neutral-200 bg-white/80 p-3 shadow-sm transition-all duration-150 hover:border-neutral-300 hover:shadow-md">
        <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-neutral-900">
          <span>Tags</span>
          <span className="text-xs text-neutral-500 transition-transform duration-150 group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  pillBase,
                  active
                    ? "border-transparent bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm hover:shadow-md"
                    : "border-neutral-200 bg-white/90 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900",
                )}
                aria-pressed={active}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </details>

      {/* Allergens Dropdown */}
      <details className="group rounded-xl border border-neutral-200 bg-white/80 p-3 shadow-sm transition-all duration-150 hover:border-neutral-300 hover:shadow-md">
        <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-neutral-900">
          <span>Allergens</span>
          <span className="text-xs text-neutral-500 transition-transform duration-150 group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {allergens.map((a) => {
            const active = selectedAllergens.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggleAllergen(a)}
                className={cn(
                  pillBase,
                  active
                    ? "border-transparent bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm hover:shadow-md"
                    : "border-neutral-200 bg-white/90 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900",
                )}
                aria-pressed={active}
              >
                {a}
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
}
