// --- path: components/HeaderServer.tsx ---

/**
 * HeaderServer
 * ------------------------------------------------------------
 * Server-side wrapper for the application header.
 *
 * Responsibilities:
 * - Retrieves the currently authenticated user on the server via Stack auth.
 * - Ensures the user exists in the application database.
 * - Optionally preloads the full user profile for client hydration.
 * - Passes server-resolved user data to the client-side Header component.
 *
 * Intended usage:
 * - Rendered from a server layout or page.
 * - Used to avoid client-side auth flicker by hydrating the Header
 *   with user data during the initial server render.
 */

import HeaderClient from "./HeaderClient";
import { stackServerApp } from "@/stack/server";
import { ensureUserInDB, getUserDetails } from "@/app/actions";

export default async function HeaderServer() {
  let serverUser = null;

  try {
    // Get current authenticated Neon user (server-side)
    const neonUser = await stackServerApp.getUser();

    if (neonUser) {
      // Ensure the authenticated user exists in the application database
      serverUser = await ensureUserInDB({
        id: neonUser.id,
        displayName: neonUser.displayName ?? "User",
      });

      // Optionally preload the full user profile for client hydration
      if (serverUser) {
        serverUser = await getUserDetails(neonUser.id);
      }
    }
  } catch (err) {
    console.error("HeaderServer: Failed to load user", err);
  }

  // Pass server-derived user data to the client header
  return <HeaderClient serverUser={serverUser} />;
}
