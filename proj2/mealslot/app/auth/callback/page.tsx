'use client';

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { client } from "@/stack/client";
import { getUserDetails } from "@/app/actions";
import { useUser } from "@/app/context/UserContext";

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshUser } = useUser();

    useEffect(() => {
        async function handle() {
            const action = searchParams.get("action") ?? "login";
            const redirectUrl = action === "signup" ? "/account" : "/";

            const neonUser = await client.getUser();
            console.debug("Auth callback: client.getUser() ->", neonUser);

            if (!neonUser) {
                console.error("No Neon user found after callback");
                return router.replace("/");
            }

            // Create user via API endpoint (proper server-side call)
            try {
                console.log(`Auth callback: creating user with auth_id=${neonUser.id}`);
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
                    console.error("Failed to create user via API:", createResponse.status, errorText);
                } else {
                    const userData = await createResponse.json();
                    console.log("User created/updated successfully:", userData);
                }
            } catch (error) {
                console.error("Error calling user creation API:", error);
            }

            const profile = await getUserDetails(neonUser.id);
            if (profile) {
                localStorage.setItem("userProfile", JSON.stringify(profile));
            }

            await refreshUser();

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
