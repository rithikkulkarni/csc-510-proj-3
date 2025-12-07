// --- path: components/InviteBar.tsx ---

/**
 * InviteBar
 * ------------------------------------------------------------
 * Client-side component that generates and displays a shareable
 * party invite link.
 *
 * Responsibilities:
 * - Derives a stable invite URL pointing to the `/party` route.
 * - Preserves any existing `?code=XXXXXX` query parameter.
 * - Provides a copy-to-clipboard action with visual feedback.
 * - Falls back to a manual prompt if the Clipboard API is unavailable.
 *
 * Intended usage:
 * - Displayed in Party mode to allow hosts or members
 *   to quickly invite others to join the same party.
 */

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link as LinkIcon, Check } from "lucide-react";

export default function InviteBar() {
  // Whether the invite link was recently copied
  const [copied, setCopied] = useState(false);

  // Compute the invite URL once on mount (client-side only)
  const invite = useMemo(() => {
    if (typeof window === "undefined") return "";
    const u = new URL(window.location.href);
    // Force the invite path to /party (query params are preserved)
    u.pathname = "/party";
    return u.toString();
  }, []);

  // Reset "Copied" indicator after a short delay
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  // Copy invite link to clipboard with a safe fallback
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(invite);
      setCopied(true);
    } catch {
      // Fallback for environments where clipboard access is blocked
      prompt("Copy this link:", invite);
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          Share this invite link with your friend. If you have a{" "}
          <code>?code=ABC123</code> in the URL, it’s included.
        </div>

        <div className="flex items-center gap-2">
          <input
            readOnly
            value={invite}
            className="w-[min(70vw,520px)] rounded border px-2 py-1 text-xs bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
          />

          <button
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-sm
                       bg-white hover:bg-neutral-100
                       dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700 dark:text-neutral-100"
            title="Copy invite link"
          >
            {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
