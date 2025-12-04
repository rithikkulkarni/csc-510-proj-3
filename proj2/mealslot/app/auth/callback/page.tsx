"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { client } from "@/stack/client";

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const action = searchParams.get("action"); // "login" or "signup"
        if (!action) {
            router.replace("/");
            return;
        }

        // Set redirect URLs
        let redirectUrl = "/";
        if (action === "signup") {
            redirectUrl = "/account"; // redirect new users to AccountPage
        }

        // Determine Neon Auth URL
        let neonUrl = "";
        if (action === "login") neonUrl = client.urls.signIn;
        if (action === "signup") neonUrl = client.urls.signUp;

        if (neonUrl) {
            // Handle relative URLs
            const fullUrl = new URL(neonUrl, window.location.origin);
            fullUrl.searchParams.set("redirect_url", redirectUrl);
            window.location.href = fullUrl.toString(); // redirect to Neon
        } else {
            router.replace(redirectUrl);
        }
    }, [router, searchParams]);

    return (
        <div className="flex items-center justify-center h-screen">
            <p className="text-lg text-gray-700">Redirecting to authentication...</p>
        </div>
    );
}
