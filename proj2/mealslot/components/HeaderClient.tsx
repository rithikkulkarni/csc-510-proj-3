"use client";

import Image from "next/image";
import Link from "next/link";
import { useUser } from "../app/context/UserContext";
import UserMenu from "./UserMenu";
import { client } from "@/stack/client";

export default function HeaderClient() {
  const { user, setUser } = useUser();
  const displayName = user?.name?.split(" ")[0] || "Guest";
  const isGuest = !user;

  const handleSignOut = () => {
    const redirectTo = "/";
    if (client.urls.signOut) {
      const signOutUrl = new URL(client.urls.signOut, window.location.origin);
      signOutUrl.searchParams.set("redirect_url", redirectTo);
      window.location.href = signOutUrl.toString();
    } else {
      setUser(null);
      window.location.href = redirectTo;
    }
  };

  const modeButtonBase =
    "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium " +
    "border bg-white text-neutral-800 shadow-sm transition-all duration-150 ease-out " +
    "hover:-translate-y-0.5 hover:scale-[1.05] hover:shadow-md active:scale-[0.97] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2";

  return (
    <header className="w-full flex flex-col md:flex-row justify-between items-center px-6 py-4 z-50 bg-white dark:bg-neutral-950 relative gap-3 md:gap-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-6">
        <Link href="/" className="inline-flex">
          <Image src="/logo.png" alt="logo" width={102} height={28} priority />
        </Link>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 md:gap-4">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Mode:
        </span>

        {/* Solo */}
        <button
          onClick={() => (window.location.href = "/")}
          className={`${modeButtonBase} bg-blue-600 text-black border-blue-600 hover:bg-blue-700`}
        >
          Solo
        </button>

        {/* Party */}
        <button
          onClick={() => (window.location.href = "/party")}
          className={`${modeButtonBase} bg-green-600 text-black border-green-600 hover:bg-green-700`}
        >
          Party
        </button>

        <div className="border-l border-neutral-300 dark:border-neutral-700 h-6" />

        {/* Logged-in user */}
        {!isGuest && (
          <div className="flex items-center gap-2">
            <UserMenu user={{ name: displayName }} onSignOut={handleSignOut} />
          </div>
        )}

        {/* Guest */}
        {isGuest && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              Welcome, Guest!
            </span>

            <Link
              href="/auth/callback?action=login"
              className="inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-medium 
              bg-orange-500 text-white shadow-sm transition-all duration-150 ease-out 
              hover:-translate-y-0.5 hover:scale-[1.05] hover:bg-orange-600 hover:shadow-md 
              active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 
              focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              Sign In / Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
