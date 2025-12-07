/**
 * cn (class name utility)
 * ------------------------------------------------------------
 * Small helper for conditionally joining CSS class names.
 *
 * Responsibilities:
 * - Accepts a list of class name values
 * - Filters out falsy entries (false, null, undefined)
 * - Returns a single space-delimited class string
 *
 * Intended usage:
 * - Simplify conditional className logic in JSX
 * - Improve readability of Tailwind / utility-first styling
 *
 * Example:
 * cn("base", isActive && "active", disabled && "opacity-50")
 */

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
