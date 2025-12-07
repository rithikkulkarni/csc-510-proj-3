/**
 * SlotMachine component
 *
 * Renders the main multi-reel slot machine UI for meal selection.
 * Handles reel locking, per-slot category selection, cooldown-controlled
 * spinning, and integration with saved meals and the parent spin handler.
 */
"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import SlotReel from "./SlotReel";
import { Dish } from "@/lib/schemas";
import { cn } from "./ui/cn";

type Locked = { index: number; dishId: string };
type Props = {
  reelCount: number; // number of reels
  onSpin(locked: Locked[]): Promise<void> | void;
  cooldownMs: number; // remaining ms from parent
  busy?: boolean;
  hasCategory?: boolean;
  savedMeals?: string[];
  onToggleSave?(dish: Dish): Promise<void> | void;
  selection?: Dish[];
  slotCategories?: string[]; // category per slot
  onCategoryChange?(index: number, category: string): void;
};

export function SlotMachine({
  reelCount,
  onSpin,
  cooldownMs,
  busy,
  hasCategory = true,
  savedMeals,
  onToggleSave,
  selection,
  slotCategories = [],
  onCategoryChange,
}: Props) {
  // Map of reel index -> locked dish ID
  const [locked, setLocked] = useState<Record<number, string>>({});

  // Reset locks whenever the number of reels changes
  useEffect(() => {
    setLocked({});
  }, [reelCount]);

  // Convert locked map to a stable array structure used by onSpin
  const lockedArray: Locked[] = useMemo(
    () =>
      Object.entries(locked)
        .filter(([, id]) => !!id)
        .map(([i, id]) => ({ index: Number(i), dishId: id })),
    [locked],
  );

  // Ensure we have a unique list of dishes for reels, with backfill if needed
  const uniqueSelection: (Dish | undefined)[] = useMemo(() => {
    const seen = new Set<string>();
    const uniques: Dish[] = [];

    (selection ?? []).forEach((dish) => {
      if (!dish || seen.has(dish.id)) return;
      seen.add(dish.id);
      uniques.push(dish);
    });

    // If we have fewer uniques than reels, backfill with original selection order
    // (even if that reintroduces dupes) so all reels render an item.
    if (uniques.length < reelCount) {
      for (const dish of selection ?? []) {
        if (!dish) continue;
        uniques.push(dish);
        if (uniques.length >= reelCount) break;
      }
    }

    return uniques;
  }, [selection, reelCount]);

  // Index-aligned list of dishes per reel
  const dishesByIndex: (Dish | undefined)[] = useMemo(() => {
    const out: (Dish | undefined)[] = [];
    for (let i = 0; i < reelCount; i++) {
      out.push(uniqueSelection?.[i]);
    }
    return out;
  }, [reelCount, uniqueSelection]);

  // String signature of selection used to detect changes
  const selectionIds = (uniqueSelection ?? []).map((d) => d?.id ?? "").join("|");

  // Maintain locks only for reels whose dish hasn't changed
  useEffect(() => {
    const next: Record<number, string> = {};
    dishesByIndex.forEach((d, i) => {
      const currentLocked = locked[i];
      if (currentLocked && d && currentLocked === d.id) {
        next[i] = currentLocked;
      }
    });
    setLocked(next);
  }, [selectionIds]);

  // Toggle lock for a given reel index
  const toggleLock = (i: number) => {
    setLocked((prev) => {
      const cur = { ...prev };
      const currentDish = dishesByIndex[i];
      if (!currentDish) return cur;
      if (cur[i]) delete cur[i];
      else cur[i] = currentDish.id;
      return cur;
    });
  };

  const canSpin = hasCategory && !busy && cooldownMs <= 0 && reelCount > 0;

  const statusMessage = !hasCategory
    ? "Choose a category to start"
    : canSpin
      ? "Lock your favorites and spin again!"
      : "Ready to spin";

  const spinButtonBase =
    "inline-flex items-center justify-center rounded-full border px-5 py-2 text-sm font-medium transform transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

  return (
    <div className="space-y-4">
      {/* Slot Machine Frame - match logo colors */}
      <div className="relative overflow-hidden rounded-3xl border-4 border-[#1F4F61] bg-[#0F1C24] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
        {/* marquee lights */}
        <div className="absolute inset-x-6 top-4 flex justify-between">
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className="h-2 w-8 rounded-full bg-[#F1C04F] shadow-[0_0_10px_rgba(241,192,79,0.8)] animate-pulse"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>

        {/* Machine Header */}
        <div className="mb-8 mt-6" />

        {/* Reels Container */}
        <div className="mb-8 rounded-2xl border-2 border-[#2B6D82] bg-[#123040] p-6 shadow-inner">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: reelCount }, (_, i) => {
              const slotCat = slotCategories[i] || "Dinner";
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  {/* Category selector above reel */}
                  {onCategoryChange && (
                    <select
                      value={slotCat}
                      onChange={(e) => onCategoryChange(i, e.target.value)}
                      className="w-full rounded-lg border border-[#2B6D82] bg-[#0F1C24] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1F4F61] focus:outline-none focus:ring-2 focus:ring-[#F1C04F] transition-colors"
                      disabled={!!busy}
                    >
                      <option value="Breakfast">🍳 Breakfast</option>
                      <option value="Lunch">🥗 Lunch</option>
                      <option value="Dinner">🍽️ Dinner</option>
                      <option value="Dessert">🍰 Dessert</option>
                      <option value="Snack">🍿 Snack</option>
                    </select>
                  )}

                  <div className="w-full rounded-2xl border-2 border-[#1F4F61] bg-gradient-to-b from-[#1F4F61] to-[#123040] p-4 shadow-[0_8px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.45)] transition-shadow">
                    <SlotReel
                      dish={dishesByIndex[i]}
                      locked={!!locked[i]}
                      onToggle={() => toggleLock(i)}
                      spinning={!!busy}
                      saved={
                        !!dishesByIndex[i] &&
                        !!savedMeals?.includes(dishesByIndex[i]!.id)
                      }
                      onToggleSave={(d) => onToggleSave?.(d)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Control Panel */}
        <div className="space-y-4 rounded-2xl border-2 border-[#2B6D82] bg-[#2B6D82] p-5 shadow-[0_8px_18px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col items-center gap-3 text-center">
            {cooldownMs > 0 && (
              <div
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-bold",
                  "bg-black/30 text-white backdrop-blur-sm animate-pulse",
                )}
                aria-live="polite"
              >
                ⏱️ {(Math.max(0, cooldownMs) / 1000).toFixed(1)}s
              </div>
            )}

            <button
              className={cn(
                spinButtonBase,
                "border-2 px-8 py-3 text-base font-black focus-visible:ring-[#E5623A] focus-visible:ring-offset-[#0F1C24]",
                canSpin
                  ? "border-[#E5623A] bg-[#E5623A] text-white shadow-[0_10px_24px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:scale-110 hover:shadow-[0_14px_30px_rgba(0,0,0,0.5)] active:scale-95 transition-all"
                  : "cursor-not-allowed border-neutral-400 bg-neutral-400 text-neutral-700",
              )}
              onClick={() => {
                if (!hasCategory) return;
                onSpin(lockedArray);
              }}
              disabled={!canSpin}
              aria-disabled={!canSpin}
            >
              {canSpin ? "✨ SPIN!" : "SPIN"}
            </button>
          </div>
          <p className="text-xs text-white/80 text-center font-semibold">
            {statusMessage}
          </p>
        </div>
      </div>
      <style jsx>{`
        @keyframes slotRotate {
          0% { transform: rotateY(0deg); }
          50% { transform: rotateY(90deg); }
          100% { transform: rotateY(0deg); }
        }
        .animate-slot-rotate { animation: slotRotate 0.6s ease-in-out; transform-style: preserve-3d; }
      `}</style>
    </div>
  );
}
