// src/app/handler/[...stack]/page.tsx
import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "../../../stack/server";

/**
 * Handler
 * ---------------------------------------------------
 * Route entry point for Stack (auth) server-side handling.
 *
 * Responsibilities:
 * - Delegate all matching /handler/[...stack] routes to StackHandler.
 * - Pass through routeProps from Next.js and the configured stackServerApp.
 */
export default function Handler(props: unknown) {
  return <StackHandler fullPage app={stackServerApp} routeProps={props} />;
}
