// --- path: components/ThemeToggle.tsx ---
/**
 * ThemeToggle component
 *
 * Provides a small, always-on-top toggle for switching between light
 * and dark themes. Reads and writes the chosen theme to <html> and
 * persists the choice in localStorage, respecting system preference
 * on first load.
 */
"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Renders an accessible theme switcher with immediate visual feedback.
 *
 * - Uses local state so the knob animates instantly.
 * - Applies/removes the "dark" class on <html>.
 * - Persists the theme in localStorage for future visits.
 * - Supports mouse, touch, and keyboard interactions.
 */
export default function ThemeToggle() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const applyTheme = (dark: boolean) => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
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
        <div className="h-6 w-12 rounded-full border-2 border-[#d6e4ea] bg-white shadow-[0_6px_18px_rgba(0,0,0,0.08)]" />
        <span className="rounded-full border border-[#d6e4ea] bg-[#f0f7fa] px-2 py-1 text-[11px] font-semibold text-[#48606c] shadow-sm">
          …
        </span>
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
          "relative h-6 w-12 rounded-full border-2 shadow-[0_6px_18px_rgba(0,0,0,0.08)] transition-all duration-200",
          isDark
            ? "border-[#5b6b78] bg-gradient-to-r from-[#0f1c24] to-[#1f2d38]"
            : "border-[#f0b35a] bg-gradient-to-r from-[#E5623A] via-[#F2A93C] to-[#F1C04F]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F1C04F] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          "dark:focus-visible:ring-[#5b6b78] dark:focus-visible:ring-offset-[#0f1720]",
        ].join(" ")}
        role="switch"
        aria-checked={isDark}
        data-testid="theme-toggle"
      >
        {/* Knob: 20px circle, 2px gutters, 28px travel */}
        <span
          className={[
            "absolute top-[2px] left-[2px] grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold leading-none shadow-md",
            "transition-transform duration-200 will-change-transform",
            isDark
              ? "translate-x-[24px] bg-[#e8edf2] text-[#0f1c24]"
              : "translate-x-0 bg-white text-[#e5623a]",
          ].join(" ")}
        >
          {isDark ? "☾" : "☀︎"}
        </span>
      </button>

      <span
        className={[
          "rounded-full px-2 py-1 text-[11px] font-semibold shadow-sm transition-colors duration-200 border",
          isDark
            ? "border-[#3b4a52] bg-[#0f1c24] text-white"
            : "border-[#d6e4ea] bg-[#f0f7fa] text-[#48606c]",
        ].join(" ")}
        data-testid="theme-label"
      >
        {isDark ? "dark" : "light"}
      </span>
    </div>
  );
}

export { ThemeToggle };
