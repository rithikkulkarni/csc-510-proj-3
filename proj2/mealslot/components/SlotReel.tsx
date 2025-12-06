"use client";

import React from "react";
import { Dish } from "@/lib/schemas";
import { cn } from "./ui/cn";

type Props = {
  dish?: Dish;
  locked: boolean;
  onToggle(): void;
  spinning?: boolean;
  saved?: boolean;
  onToggleSave?(dish: Dish): Promise<void> | void;
};

export default function SlotReel({ dish, locked, onToggle, spinning, saved, onToggleSave }: Props) {
  const lockButtonBase =
    "rounded-full border px-3 py-1.5 text-xs md:text-sm font-medium transform transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 hover:-translate-y-0.5 hover:scale-[1.05] active:scale-[0.97]";

  return (
    <div
      className={cn(
        "relative flex h-40 w-full flex-col justify-between rounded-2xl border border-neutral-200 bg-white/90 p-3 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md",
        locked && "border-orange-400 shadow-md",
        spinning && "animate-slot-rotate",
      )}
    >
      <button
        type="button"
        className={cn(
          "absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
          "transform transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          saved
            ? "border-transparent bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-[0_8px_18px_rgba(244,63,94,0.35)] hover:-translate-y-0.5 hover:scale-[1.05] active:scale-[0.97]"
            : "border-brand-aqua/70 bg-white text-brand-dusk hover:-translate-y-0.5 hover:scale-[1.05] active:scale-[0.97] hover:border-red-300 hover:text-red-500",
        )}
        onClick={() => dish && onToggleSave?.(dish)}
        aria-pressed={!!saved}
        aria-label={saved ? "Unsave meal" : "Save meal"}
        disabled={!dish}
      >
        {saved ? "♥" : "♡"}
      </button>
      <div className="min-h-12 pr-10">
        <div
          className="line-clamp-2 text-base md:text-lg font-semibold tracking-tight text-[#0F1C24]"
          suppressHydrationWarning
        >
          {dish?.name ?? ""}
        </div>
        <div
          className="mt-1 text-xs md:text-sm font-medium text-[#48606c]"
          suppressHydrationWarning
        >
          {dish?.category ?? ""}
        </div>
      </div>
      <button
        className={cn(
          lockButtonBase,
          locked
            ? "border-transparent bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm hover:shadow-md"
            : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900",
        )}
        onClick={onToggle}
        aria-pressed={locked}
      >
        {locked ? "Unlock" : "Lock"}
      </button>
    </div>
  );
}
