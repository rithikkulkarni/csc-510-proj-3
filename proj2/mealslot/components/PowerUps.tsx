"use client";

import React from "react";
import { PowerUpsInput } from "@/lib/schemas";
import { cn } from "./ui/cn";

export function PowerUps({
  value,
  onChange,
}: {
  value: PowerUpsInput;
  onChange: (v: PowerUpsInput) => void;
}) {
  const toggle = (k: keyof PowerUpsInput) =>
    onChange({ ...value, [k]: !value[k] });

  const pillBase =
    "rounded-full border px-3 py-1.5 text-xs md:text-sm font-medium transform transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 hover:-translate-y-0.5 hover:scale-[1.05] active:scale-[0.97]";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => toggle("healthy")}
        className={cn(
          pillBase,
          value.healthy
            ? "border-transparent bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm hover:shadow-md"
            : "border-neutral-200 bg-white/90 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900",
        )}
        aria-pressed={!!value.healthy}
      >
        Healthy
      </button>

      <button
        type="button"
        onClick={() => toggle("cheap")}
        className={cn(
          pillBase,
          value.cheap
            ? "border-transparent bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm hover:shadow-md"
            : "border-neutral-200 bg-white/90 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900",
        )}
        aria-pressed={!!value.cheap}
      >
        Cheap
      </button>

      <button
        type="button"
        onClick={() => toggle("max30m")}
        className={cn(
          pillBase,
          value.max30m
            ? "border-transparent bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm hover:shadow-md"
            : "border-neutral-200 bg-white/90 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900",
        )}
        aria-pressed={!!value.max30m}
      >
        ≤30m
      </button>
    </div>
  );
}
