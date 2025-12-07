// --- path: components/ClientMount.tsx ---

/**
 * ClientMount
 * ------------------------------------------------------------
 * Minimal client-only wrapper component used to mount React
 * client components inside a server-rendered layout.
 *
 * Responsibilities:
 * - Forces the subtree to be treated as a client component via `"use client"`.
 * - Acts as a safe boundary for hooks, context providers, and browser-only APIs.
 * - Does not introduce any markup or behavior of its own.
 *
 * Intended usage:
 * - Placed inside the root server layout’s <body>.
 * - Used to wrap providers, client-side state, or UI that cannot render on the server.
 */

"use client";

import React, { type ReactNode } from "react";

/** Client-only wrapper rendered inside the server layout’s <body>. */
export default function ClientMount({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
