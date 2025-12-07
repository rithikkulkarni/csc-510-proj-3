"use client";

import { useUser } from "@/app/context/UserContext";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/components/ui/cn";
import {
  cardClass,
  categoryPillBase,
  contentClass,
  sectionTitleClass,
  shellClass,
} from "@/components/ui/style";

type Dish = {
  id: string;
  name: string;
  category?: string;
  description?: string | null;
};

/**
 * SavedMealsPage
 * ---------------------------------------------------
 * Displays the current user's saved meals with:
 * - Category-based filtering (All/Snack/Breakfast/Lunch/Dinner/Dessert).
 * - Ability to remove individual saved meals.
 * - Sign-in prompt if there is no authenticated user.
 */
export default function SavedMealsPage() {
  const { user, setUser, refreshUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  /**
   * Load the full dish catalog once so we can resolve savedMeal IDs
   * into complete Dish objects.
   */
  useEffect(() => {
    async function fetchDishes() {
      try {
        const res = await fetch("/api/dishes");
        if (!res.ok) return;
        const data = await res.json();
        setAllDishes(data ?? []);
      } catch (err) {
        console.error("Failed to load dishes", err);
      }
    }
    fetchDishes();
  }, []);

  /**
   * Resolve user.savedMeals (IDs) into full Dish objects using the
   * locally cached dish catalog. Unknown IDs are dropped.
   */
  const savedMeals: Dish[] = useMemo(() => {
    const catalog = new Map(allDishes.map((d) => [d.id, d]));
    return (user?.savedMeals || [])
      .map((id) => catalog.get(id))
      .filter(Boolean) as Dish[];
  }, [allDishes, user?.savedMeals]);

  // Apply category filter (or show all saved meals)
  const filteredMeals =
    activeCategory === "all"
      ? savedMeals
      : savedMeals.filter((m) => m.category === activeCategory);

  // Standard categories matching the Dish table
  const standardCategories = ["Snack", "Breakfast", "Lunch", "Dinner", "Dessert"];

  /**
   * Compute the category filter list:
   * - Start from a standard category set.
   * - Only include categories that actually appear in saved meals.
   * - Always prefix with "all".
   */
  const categories = useMemo(() => {
    const categoriesInMeals = new Set<string>();
    savedMeals.forEach((m) => m.category && categoriesInMeals.add(m.category));

    const filtered = standardCategories.filter((c) =>
      categoriesInMeals.has(c)
    );
    return ["all", ...filtered];
  }, [savedMeals]);

  /**
   * Remove a meal from the user's saved list:
   * - Optimistically update local UserContext.
   * - Persist via /api/user/saved.
   * - RefreshUser to ensure consistency with the backend.
   */
  const handleRemoveMeal = async (mealId: string) => {
    setLoading(true);
    try {
      const next = user?.savedMeals?.filter((id) => id !== mealId) || [];

      // Optimistic update of the in-memory user profile
      if (user) setUser({ ...user, savedMeals: next });

      // Persist to the backend for authenticated users
      if (user?.id) {
        await fetch("/api/user/saved", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            authId: user.auth_id || user.id,
            savedMeals: next,
          }),
        });
      }

      await refreshUser();
    } catch (err) {
      console.error("Failed to remove meal:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={shellClass}>
      <div className={contentClass}>
        <section className={cn(cardClass, "space-y-4")}>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold text-brand-dusk dark:text-white">
              Saved Meals
            </h1>
            <p className="text-sm text-brand-dusk/80 dark:text-brand-glow/80">
              Quickly filter your favorites by category and prune what you no
              longer want.
            </p>
          </div>

          {/* If the user is not signed in, prompt them to log in */}
          {!user ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-[rgba(var(--card-border),0.7)] bg-[rgb(var(--card))] p-6 shadow-sm">
              <p className="text-base text-brand-dusk dark:text-white">
                You must be signed in to see favorites.
              </p>
              <Link
                href="/auth/callback?action=login"
                className="rounded-full border-2 border-[#E5623A] bg-gradient-to-r from-[#E5623A] to-[#F1C04F] px-4 py-2 text-sm font-semibold text-[#0F1C24] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Category filter pills */}
              <div>
                <h2 className={sectionTitleClass}>Filter by category</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const active = activeCategory === c;
                    const label = c === "all" ? "All" : c;
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setActiveCategory(c)}
                        className={cn(
                          categoryPillBase,
                          active
                            ? "border-transparent bg-gradient-to-r from-brand-coral to-brand-gold text-brand-dusk shadow-glow"
                            : "text-brand-dusk hover:text-brand-dusk hover:border-brand-gold/80 dark:text-white/80 dark:hover:text-white"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Saved meal cards */}
              {filteredMeals.length === 0 ? (
                <p className="text-sm text-brand-dusk/80 dark:text-brand-glow/80">
                  You have no saved meals yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {filteredMeals.map((meal) => (
                    <div
                      key={meal.id}
                      className="relative rounded-2xl border border-[rgba(var(--card-border),0.7)] bg-[rgb(var(--card))] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel"
                    >
                      <button
                        onClick={() => handleRemoveMeal(meal.id)}
                        disabled={loading}
                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(var(--card-border),0.8)] bg-[rgb(var(--card))] text-xs text-brand-dusk/70 transition hover:border-red-300 hover:text-red-600"
                        aria-label="Remove saved meal"
                      >
                        ×
                      </button>
                      <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-brand-dusk dark:text-white">
                          {meal.name}
                        </h2>
                        {meal.category && (
                          <p className="text-xs uppercase tracking-wide text-brand-dusk/60 dark:text-brand-glow/80">
                            {meal.category}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
