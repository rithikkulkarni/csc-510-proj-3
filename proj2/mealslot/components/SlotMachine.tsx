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
  selection?: Dish[];
};

export function SlotMachine({
  reelCount,
  onSpin,
  cooldownMs,
  busy,
  selection,
}: Props) {
  const [locked, setLocked] = useState<Record<number, string>>({});

  useEffect(() => {
    setLocked({});
  }, [reelCount]);

  const lockedArray: Locked[] = useMemo(
    () =>
      Object.entries(locked)
        .filter(([, id]) => !!id)
        .map(([i, id]) => ({ index: Number(i), dishId: id })),
    [locked],
  );

  const dishesByIndex: (Dish | undefined)[] = useMemo(() => {
    const out: (Dish | undefined)[] = [];
    for (let i = 0; i < reelCount; i++) {
      out.push(selection?.[i]);
    }
    return out;
  }, [reelCount, selection]);

  useEffect(() => {
    const next: Record<number, string> = {};
    dishesByIndex.forEach((d, i) => {
      const currentLocked = locked[i];
      if (currentLocked && d && currentLocked === d.id) {
        next[i] = currentLocked;
      }
    });
    setLocked(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection && selection.map((d) => d.id).join("|")]);

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

  const canSpin = !busy && cooldownMs <= 0 && reelCount > 0;

  const spinButtonBase =
    "inline-flex items-center justify-center rounded-full border px-5 py-2 text-sm font-medium transform transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base md:text-lg font-semibold text-neutral-900">
          Slot Machine
        </h2>
        <div
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-medium",
            cooldownMs > 0
              ? "bg-orange-50 text-orange-700"
              : "text-neutral-400",
          )}
          aria-live="polite"
        >
          {cooldownMs > 0
            ? `Cooldown: ${(Math.max(0, cooldownMs) / 1000).toFixed(1)}s`
            : "Ready to spin"}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: reelCount }, (_, i) => (
          <SlotReel
            key={i}
            dish={dishesByIndex[i]}
            locked={!!locked[i]}
            onToggle={() => toggleLock(i)}
          />
        ))}
      </div>

      <div className="pt-1">
        <button
          className={cn(
            spinButtonBase,
            canSpin
              ? "border-transparent bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm hover:-translate-y-0.5 hover:scale-[1.05] hover:shadow-md active:scale-[0.97]"
              : "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400",
          )}
          onClick={() => onSpin(lockedArray)}
          disabled={!canSpin}
          aria-disabled={!canSpin}
        >
          {canSpin ? "✨ Spin" : "Spin"}
        </button>
      </div>
    </div>
  );
}
