/**
 * styles.ts
 * ------------------------------------------------------------
 * Centralized layout and UI utility class definitions.
 *
 * Responsibilities:
 * - Exposes reusable Tailwind class strings for consistent layout and styling
 *   across the site.
 * - Keeps visual concerns (spacing, typography, colors) out of component logic.
 * - Acts as a single source of truth for common UI patterns (shell, cards,
 *   section headers, pills).
 *
 * Intended usage:
 * - Imported by page and component files to standardize appearance.
 * - Updated when global layout or visual design changes are required.
 */

// app/(site)/styles.ts

/** Outer page shell: full-height background and responsive padding */
export const shellClass =
  "min-h-screen bg-[rgb(var(--bg))] text-white px-4 py-6 md:px-8 lg:px-16";

/** Main content wrapper: centered column with consistent vertical spacing */
export const contentClass =
  "mx-auto flex w-full max-w-5xl flex-col gap-6 pb-12";

/** Standard card container styling */
export const cardClass =
  "card p-5 shadow-panel";

/** Section header text (used for titles within cards/pages) */
export const sectionTitleClass =
  "mb-2 text-lg md:text-xl font-semibold text-brand-dusk dark:text-white";

/** Secondary section text for descriptions or guidance */
export const sectionSubtitleClass =
  "text-sm text-brand-dusk/70 dark:text-brand-glow/80";

/** Base styling for category / filter pills */
export const categoryPillBase =
  "pill border-brand-aqua/70 bg-white text-brand-dusk dark:bg-brand-navy/70 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dusk hover:-translate-y-0.5 hover:scale-[1.03] hover:border-brand-gold";
