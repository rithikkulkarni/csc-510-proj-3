// --- path: components/Toast.tsx ---
/**
 * ToastStack component
 *
 * Renders a fixed stack of transient toast messages in the top-right
 * corner of the viewport. Each toast automatically expires after a
 * configurable TTL and notifies the parent via a callback.
 */
"use client";

import React, { useEffect } from "react";

export type ToastMsg = { id: string; text: string; ttl?: number };

/**
 * Displays a list of toast messages and schedules their expiration.
 * New items reset timers, and expired toasts are reported via onExpire.
 */
export default function ToastStack({
  items,
  onExpire,
}: {
  items: ToastMsg[];
  onExpire: (id: string) => void;
}) {
  useEffect(() => {
    const timers = items.map((t) =>
      setTimeout(() => onExpire(t.id), t.ttl ?? 2600),
    );
    return () => {
      for (const timer of timers) clearTimeout(timer as any);
    };
  }, [items, onExpire]);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-50 flex w-80 flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-md dark:border-neutral-700 dark:bg-neutral-900"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
