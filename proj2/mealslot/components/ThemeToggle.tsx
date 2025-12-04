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
        <div className="h-6 w-12 rounded-full border border-neutral-200 bg-white/80 shadow-sm" />
        <span className="text-xs text-neutral-500">…</span>
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
          "relative flex h-7 w-14 items-center rounded-full border text-[11px]",
          "transition-all duration-200 ease-out will-change-transform",
          "shadow-sm hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]",
          isDark
            ? "border-neutral-600 bg-neutral-900"
            : "border-orange-300 bg-gradient-to-r from-orange-400 to-rose-400",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50",
          "dark:focus-visible:ring-neutral-500 dark:focus-visible:ring-offset-neutral-900",
        ].join(" ")}
        role="switch"
        aria-checked={isDark}
        data-testid="theme-toggle"
      >
        {/* Knob: 20px circle, 2px gutters, 28px travel */}
        <span
          className={[
            "absolute top-[3px] left-[3px] grid h-5 w-5 place-items-center rounded-full text-[11px] leading-none shadow",
            "transition-transform duration-200 will-change-transform",
            isDark
              ? "translate-x-[30px] bg-neutral-800 text-neutral-200"
              : "translate-x-0 bg-white text-orange-500",
          ].join(" ")}
        >
          {isDark ? "☾" : "☀︎"}
        </span>
      </button>

      <span
        className="text-xs font-medium text-neutral-600 dark:text-neutral-300"
        data-testid="theme-label"
      >
        {isDark ? "dark" : "light"}
      </span>
    </div>
  );
}

export { ThemeToggle };
