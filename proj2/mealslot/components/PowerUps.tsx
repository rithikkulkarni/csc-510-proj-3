/**
 * PowerUps UI component
 *
 * Renders a small set of toggleable pill buttons used to apply
 * quick preference filters (e.g., healthy, cheap, fast) in the
 * meal slot selection flow.
 */
"use client";

import React from "react";
import { PowerUpsInput } from "@/lib/schemas";
import { cn } from "./ui/cn";
import { categoryPillBase } from "./ui/style";

export function PowerUps({
  value,
  onChange,
}: {
  value: PowerUpsInput;
  onChange: (v: PowerUpsInput) => void;
}) {
  // Toggle a single flag while preserving remaining values
  const toggle = (k: keyof PowerUpsInput) =>
    onChange({ ...value, [k]: !value[k] });

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => toggle("healthy")}
        className={cn(
          categoryPillBase,
          value.healthy
            ? "border-transparent bg-gradient-to-r from-brand-coral to-brand-gold text-brand-dusk shadow-glow"
            : "text-brand-dusk hover:text-brand-dusk hover:border-brand-gold/80 dark:text-white/80 dark:hover:text-white",
        )}
        aria-pressed={!!value.healthy}
      >
        Healthy
      </button>

      <button
        type="button"
        onClick={() => toggle("cheap")}
        className={cn(
          categoryPillBase,
          value.cheap
            ? "border-transparent bg-gradient-to-r from-brand-coral to-brand-gold text-brand-dusk shadow-glow"
            : "text-brand-dusk hover:text-brand-dusk hover:border-brand-gold/80 dark:text-white/80 dark:hover:text-white",
        )}
        aria-pressed={!!value.cheap}
      >
        Cheap
      </button>

      <button
        type="button"
        onClick={() => toggle("max30m")}
        className={cn(
          categoryPillBase,
          value.max30m
            ? "border-transparent bg-gradient-to-r from-brand-coral to-brand-gold text-brand-dusk shadow-glow"
            : "text-brand-dusk hover:text-brand-dusk hover:border-brand-gold/80 dark:text-white/80 dark:hover:text-white",
        )}
        aria-pressed={!!value.max30m}
      >
        ≤30m
      </button>
    </div>
  );
}
