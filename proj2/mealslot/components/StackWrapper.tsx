/**
 * StackWrapper component
 *
 * Provides Stack authentication theming and a simple entry point
 * for login and signup flows using StackHandler routes.
 * Acts as a lightweight wrapper around StackTheme.
 */
"use client";

import { StackTheme } from "@stackframe/stack";
import React from "react";

/**
 * Wraps authentication-related content with Stack's theme provider.
 * Intended for use on login/signup pages to ensure consistent styling
 * and clear guidance on available auth routes.
 */
export default function StackWrapper() {
  return (
    <StackTheme>
      <div>
        <h2>Login / Signup</h2>
        <p>
          Use the StackHandler routes at <code>/handler/sign-up</code> or{" "}
          <code>/handler/login</code>.
        </p>
      </div>
    </StackTheme>
  );
}
