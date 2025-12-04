"use client";

import Image from "next/image";
import Link from "next/link";
import { useUser } from "../app/context/UserContext";
import UserMenu from "./UserMenu";
import ThemeToggle from "./ThemeToggle";
import { client } from "@/stack/client";

export default function HeaderClient() {
    const { user, setUser } = useUser();
    const displayName = user?.name?.split(" ")[0] || "Guest";
    const isGuest = !user;

    const handleSignOut = () => {
        const redirectTo = "/"; // homepage
        if (client.urls.signOut) {
            // ensure absolute URL
            const signOutUrl = new URL(client.urls.signOut, window.location.origin);
            signOutUrl.searchParams.set("redirect_url", redirectTo);
            window.location.href = signOutUrl.toString();
        } else {
            // fallback for local logout
            setUser(null);
            window.location.href = redirectTo; // redirect locally
        }
    };



    return (
        <header className="w-full flex flex-col md:flex-row justify-between items-center px-6 py-4 z-50 bg-white dark:bg-neutral-950 relative gap-3 md:gap-0">
            {/* Left: Logo */}
            <div className="flex items-center gap-6">
                <Link href="/" className="inline-flex">
                    <Image src="/logo.png" alt="logo" width={102} height={28} priority />
                </Link>
            </div>

            {/* Center / Right: Solo/Party + UserMenu */}
            <div className="flex items-center gap-3 md:gap-4">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Mode:
                </span>
                <button
                    onClick={() => (window.location.href = "/")}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition text-sm"
                >
                    Solo
                </button>
                <button
                    onClick={() => (window.location.href = "/party")}
                    className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition text-sm"
                >
                    Party
                </button>
                <div className="border-l border-neutral-300 dark:border-neutral-700 h-6" />

                {!isGuest && (
                    <div className="flex items-center gap-2">
                        <UserMenu user={{ name: displayName }} onSignOut={handleSignOut} />
                    </div>
                )}

                {isGuest && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                            Welcome, Guest!
                        </span>
                        <Link
                            href="/auth/callback?action=login"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition"
                        >
                            Sign In / Sign Up
                        </Link>
                    </div>
                )}

                <ThemeToggle />
            </div>
        </header>
    );
}
