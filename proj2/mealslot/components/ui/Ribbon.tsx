/**
 * Ribbon
 * ------------------------------------------------------------
 * Lightweight semantic heading component used as a section label.
 *
 * Responsibilities:
 * - Renders a styled heading (`h3`) for card or panel sections
 * - Accepts optional `className` for local style overrides
 * - Keeps typography consistent across the app
 *
 * Intended usage:
 * - Card headers
 * - Section titles inside panels, sidebars, or modals
 * - Visual grouping of related UI content
 */

import React from "react";

type RibbonProps = {
  /** Text or elements displayed as the section title */
  children: React.ReactNode;
  /** Optional additional Tailwind classes */
  className?: string;
};

export function Ribbon({ children, className = "" }: RibbonProps) {
  return (
    <h3
      className={`mb-3 text-lg font-bold text-neutral-900 dark:text-white ${className}`}
    >
      {children}
    </h3>
  );
}
