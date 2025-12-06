'use client';

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { client } from "@/stack/client";
import { ensureUserInDB, getUserDetails } from "@/app/actions";
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

            await ensureUserInDB({
                id: neonUser.id,
                displayName: neonUser.displayName ?? "User",
            });

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
