'use client';

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { client } from "@/stack/client";
import { getUserDetails } from "@/app/actions";
import { useUser } from "@/app/context/UserContext";

/**
 * AuthCallbackPage
 * ---------------------------------------------------
 * Handles the redirect from the auth provider (Stack/Neon).
 *
 * Responsibilities:
 * - Read the `action` query param to determine redirect target.
 * - Fetch the authenticated user from the Stack client.
 * - Call `/api/user/create` to upsert the corresponding app user record.
 * - Fetch and cache the user's profile (getUserDetails).
 * - Refresh the global UserContext and redirect to the final page.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useUser();

  useEffect(() => {
    async function handle() {
      const action = searchParams.get("action") ?? "login";
      const redirectUrl = action === "signup" ? "/account" : "/";

      // Get authenticated user from Stack/Neon
      const neonUser = await client.getUser();
      console.debug("Auth callback: client.getUser() ->", neonUser);

      if (!neonUser) {
        console.error("No Neon user found after callback");
        return router.replace("/");
      }

      // Create or update app user via API (server-side persistence)
      try {
        console.log(
          `Auth callback: creating user with auth_id=${neonUser.id}`
        );
        const createResponse = await fetch("/api/user/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auth_id: neonUser.id,
            displayName: neonUser.displayName ?? "User",
          }),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error(
            "Failed to create user via API:",
            createResponse.status,
            errorText
          );
        } else {
          const userData = await createResponse.json();
          console.log("User created/updated successfully:", userData);
        }
      } catch (error) {
        console.error("Error calling user creation API:", error);
      }

      // Load the full user profile from the app DB and cache it locally
      const profile = await getUserDetails(neonUser.id);
      if (profile) {
        localStorage.setItem("userProfile", JSON.stringify(profile));
      }

      // Refresh UserContext to reflect the latest profile
      await refreshUser();

      // Finally, redirect the user to the appropriate page
      router.replace(redirectUrl);
    }

    handle();
  }, [router, searchParams, refreshUser]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Redirecting...</p>
    </div>
  );
}
