// --- path: components/DishCountInput.tsx ---

/**
 * DishCountInput
 * ------------------------------------------------------------
 * Client-side numeric input component for selecting the number
 * of dishes to include in a spin.
 *
 * Responsibilities:
 * - Provides increment/decrement controls plus a manual input field.
 * - Ensures only numeric input is accepted.
 * - Keeps local input state in sync with the external `value` prop.
 * - Emits validated numeric updates via `onChange`.
 *
 * Intended usage:
 * - Used in configuration or filter panels where users control
 *   how many dishes should be generated or spun.
 * - Designed as a controlled component with lightweight internal state
 *   for better UX while typing.
 */

"use client";

import React, { useState } from "react";
import { cn } from "./ui/cn";

type DishCountInputProps = {
  /** Current dish count value */
  value: number;
  /** Called when the dish count changes */
  onChange: (newCount: number) => void;
};

export default function DishCountInput({ value, onChange }: DishCountInputProps) {
  // Local string state allows smooth typing (including empty state)
  const [input, setInput] = useState(value.toString());

  // Handle numeric-only input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Allow only digits or empty string
    if (/^\d*$/.test(val)) {
      setInput(val);

      if (val === "") return;

      const parsed = Math.max(0, parseInt(val, 10) || 0);
      onChange(parsed);
    }
  };

  // Reset to last valid value if input is left empty on blur
  const handleBlur = () => {
    if (input === "") {
      setInput(String(value ?? 0));
      onChange(value ?? 0);
    }
  };

  // Shared button styling for increment/decrement controls
  const pillBtn =
    "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 ease-out hover:-translate-y-0.5 hover:scale-[1.07] active:scale-[0.95] hover:bg-neutral-50 hover:border-neutral-300 bg-white border-neutral-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50";

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-neutral-800">
        Number of Dishes:
      </label>

      <div className="flex items-center gap-2">
        {/* Decrement button */}
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className={pillBtn}
          aria-label="Decrease dish count"
        >
          –
        </button>

        {/* Numeric input */}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={input}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            "w-20 rounded-full border px-3 py-1.5 text-sm font-medium text-center transition-all",
            "bg-white text-neutral-900 placeholder:text-neutral-500 border-neutral-200 shadow-sm",
            "hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400",
            "active:scale-[0.98]",
          )}
          placeholder="0"
          aria-label="Number of dishes"
        />

        {/* Increment button */}
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value + 1))}
          className={pillBtn}
          aria-label="Increase dish count"
        >
          +
        </button>
      </div>
    </div>
  );
}
