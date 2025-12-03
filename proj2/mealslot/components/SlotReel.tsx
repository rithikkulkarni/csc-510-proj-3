"use client";

import React from "react";
import { Dish } from "@/lib/schemas";
import { cn } from "./ui/cn";

type Props = {
  dish?: Dish;
  locked: boolean;
  onToggle(): void;
};

export default function SlotReel({ dish, locked, onToggle }: Props) {
  const lockButtonBase =
    "rounded-full border px-3 py-1.5 text-xs md:text-sm font-medium transform transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 hover:-translate-y-0.5 hover:scale-[1.05] active:scale-[0.97]";

  return (
    <div
      className={cn(
        "flex h-40 w-full flex-col justify-between rounded-2xl border border-neutral-200 bg-white/90 p-3 shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md",
        locked && "border-orange-400 shadow-md",
      )}
    >
      <div className="min-h-12">
        <div
          className="line-clamp-2 text-sm md:text-base font-semibold text-neutral-900"
          suppressHydrationWarning
        >
          {dish?.name ?? ""}
        </div>
        <div
          className="mt-1 text-xs text-neutral-500"
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
