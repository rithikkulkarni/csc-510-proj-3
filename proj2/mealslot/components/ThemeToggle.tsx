// --- path: components/ThemeToggle.tsx ---
"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * ThemeToggle
 * - Knob slides immediately via local state.
 * - Flips <html class="dark"> and persists to localStorage.
 * - z-50 + pointer-events-auto so overlays don't block it.
 * - Handles click, pointerdown (mobile), keyboard.
 * - Shows a live label for sanity checks.
 */
export default function ThemeToggle() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const applyTheme = (dark: boolean) => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch { }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme"); // "dark" | "light" | null
      const domHas = document.documentElement.classList.contains("dark");
      const prefers =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches;

      const initial = stored === "dark" || (!stored && (domHas || prefers));
      setIsDark(initial);
      applyTheme(initial);
    } finally {
      setMounted(true);
    }
  }, []);

  const flip = () => {
    const next = !isDark;
    setIsDark(next); // slide knob right away
    requestAnimationFrame(() => applyTheme(next));
  };

  if (!mounted) {
    return (
      <div className="relative z-50 pointer-events-auto flex items-center gap-2">
<<<<<<< HEAD
        <div className="h-6 w-12 rounded-full border-2 border-[#d6e4ea] bg-white shadow-[0_6px_18px_rgba(0,0,0,0.08)]" />
        <span className="rounded-full border border-[#d6e4ea] bg-[#f0f7fa] px-2 py-1 text-[11px] font-semibold text-[#48606c] shadow-sm">…</span>
=======
        <div className="h-6 w-12 rounded-full border border-neutral-200 bg-white/80 shadow-sm" />
        <span className="text-xs text-neutral-500">…</span>
>>>>>>> 15c4f95dd6ffd9b8ff27f9d3aca083a6831ef7c9
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="relative z-50 pointer-events-auto flex items-center gap-2"
    >
      <button
        type="button"
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
        onClick={(e) => {
          e.stopPropagation();
          flip();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            flip();
          }
        }}
        className={[
<<<<<<< HEAD
          "relative h-6 w-12 rounded-full border-2 shadow-[0_6px_18px_rgba(0,0,0,0.08)] transition-all duration-200",
          isDark
            ? "border-[#5b6b78] bg-gradient-to-r from-[#0f1c24] to-[#1f2d38]"
            : "border-[#f0b35a] bg-gradient-to-r from-[#E5623A] via-[#F2A93C] to-[#F1C04F]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F1C04F] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          "dark:focus-visible:ring-[#5b6b78] dark:focus-visible:ring-offset-[#0f1720]",
=======
          "relative flex h-7 w-14 items-center rounded-full border text-[11px]",
          "transition-all duration-200 ease-out will-change-transform",
          "shadow-sm hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]",
          isDark
            ? "border-neutral-600 bg-neutral-900"
            : "border-orange-300 bg-gradient-to-r from-orange-400 to-rose-400",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50",
          "dark:focus-visible:ring-neutral-500 dark:focus-visible:ring-offset-neutral-900",
>>>>>>> 15c4f95dd6ffd9b8ff27f9d3aca083a6831ef7c9
        ].join(" ")}
        role="switch"
        aria-checked={isDark}
        data-testid="theme-toggle"
      >
        {/* Knob: 20px circle, 2px gutters, 28px travel */}
        <span
          className={[
<<<<<<< HEAD
            "absolute top-[2px] left-[2px] grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold leading-none shadow-md",
            "transition-transform duration-200 will-change-transform",
            isDark
              ? "translate-x-[24px] bg-[#e8edf2] text-[#0f1c24]"
              : "translate-x-0 bg-white text-[#e5623a]",
=======
            "absolute top-[3px] left-[3px] grid h-5 w-5 place-items-center rounded-full text-[11px] leading-none shadow",
            "transition-transform duration-200 will-change-transform",
            isDark
              ? "translate-x-[30px] bg-neutral-800 text-neutral-200"
              : "translate-x-0 bg-white text-orange-500",
>>>>>>> 15c4f95dd6ffd9b8ff27f9d3aca083a6831ef7c9
          ].join(" ")}
        >
          {isDark ? "☾" : "☀︎"}
        </span>
      </button>

      <span
<<<<<<< HEAD
        className={[
          "rounded-full px-2 py-1 text-[11px] font-semibold shadow-sm transition-colors duration-200 border",
          isDark
            ? "border-[#3b4a52] bg-[#0f1c24] text-white"
            : "border-[#d6e4ea] bg-[#f0f7fa] text-[#48606c]",
        ].join(" ")}
=======
        className="text-xs font-medium text-neutral-600 dark:text-neutral-300"
>>>>>>> 15c4f95dd6ffd9b8ff27f9d3aca083a6831ef7c9
        data-testid="theme-label"
      >
        {isDark ? "dark" : "light"}
      </span>
    </div>
  );
}

export { ThemeToggle };
