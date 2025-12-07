// --- path: components/HeaderClient.tsx ---

/**
 * HeaderClient
 * ------------------------------------------------------------
 * Client-side application header shared across solo and party modes.
 *
 * Responsibilities:
 * - Displays branding, navigation, and current application mode (Solo / Party).
 * - Initializes the client-side user context from a server-provided user.
 * - Reflects authentication state (guest vs signed-in user).
 * - Provides sign-in, sign-out, and theme-toggle controls.
 *
 * Intended usage:
 * - Rendered at the top of the app layout as a persistent navigation header.
 * - Used only on the client (relies on routing state, context, and browser APIs).
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "../app/context/UserContext";
import UserMenu from "./UserMenu";
import ThemeToggle from "./ThemeToggle";
import { client } from "@/stack/client";
import { Bungee, Sora } from "next/font/google";

// Bold, arcade-inspired font to match the slot theme
const slotTitleFont = Bungee({ subsets: ["latin"], weight: "400" });
const sloganFont = Sora({ subsets: ["latin"], weight: ["500"] });

export default function HeaderClient({ serverUser }: { serverUser: any }) {
  const { user, setUser } = useUser();
  const pathname = usePathname();
  const isSoloMode = pathname === "/";
  const isPartyMode = pathname?.startsWith("/party");

  /**
   * Initialize client-side user context from the server-rendered user
   * on first mount. This avoids an extra client fetch on load.
   */
  useEffect(() => {
    if (serverUser && !user) {
      setUser(serverUser);
    }
  }, [serverUser, user, setUser]);

  const displayName = user?.name?.split(" ")[0] || "Guest";
  const isGuest = !user;

  /**
   * Handles user sign-out by redirecting through the auth provider
   * when available, with a fallback to local state reset.
   */
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

  return (
    <header className="flex w-full items-center justify-between bg-[rgb(var(--card))] px-5 py-3 shadow-panel border-b border-[rgba(var(--card-border),0.85)] backdrop-blur">
      {/* Logo + branding */}
      <div className="flex items-center gap-3 md:gap-4">
        <Link href="/" className="inline-flex items-center gap-3 md:gap-4">
          <Image src="/logo.png" alt="logo" width={110} height={32} priority />
          <div className="flex flex-col leading-tight">
            <span
              className={`${sloganFont.className} text-[11px] md:text-sm font-medium text-[rgb(var(--muted))]`}
            >
              The slot-inspired meal picker
            </span>
            <span
              className={`${slotTitleFont.className} text-4xl font-semibold tracking-tight md:text-5xl bg-gradient-to-r from-[#F2A93C] via-[#F6D365] to-[#F2A93C] bg-clip-text text-transparent`}
              style={{ WebkitTextStroke: "1px #6c7a84" }}
            >
              MealSlot
            </span>
          </div>
        </Link>
      </div>

      {/* Mode switch + user controls */}
      <div className="flex items-center gap-3 md:gap-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
          Mode
        </span>

        <button
          onClick={() => (window.location.href = "/")}
          className={
            isSoloMode
              ? "rounded-full border-2 border-[#E5623A] bg-gradient-to-r from-[#E5623A] to-[#F1C04F] px-4 py-1.5 text-sm font-semibold text-[#0F1C24] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              : "rounded-full border border-[rgba(var(--card-border),0.9)] bg-[rgb(var(--card))] px-4 py-1.5 text-sm font-semibold text-[rgb(var(--fg))] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#E5623A]"
          }
        >
          Solo
        </button>

        <button
          onClick={() => (window.location.href = "/party")}
          className={
            isPartyMode
              ? "rounded-full border-2 border-[#E5623A] bg-gradient-to-r from-[#E5623A] to-[#F1C04F] px-4 py-1.5 text-sm font-semibold text-[#0F1C24] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              : "rounded-full border border-[rgba(var(--card-border),0.9)] bg-[rgb(var(--card))] px-4 py-1.5 text-sm font-semibold text-[rgb(var(--fg))] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#E5623A]"
          }
        >
          Party
        </button>

        <div className="h-6 border-l border-[rgba(var(--card-border),0.7)]" />

        {/* Authenticated user menu */}
        {!isGuest && (
          <div className="flex items-center gap-2">
            <UserMenu user={{ name: displayName }} onSignOut={handleSignOut} />
          </div>
        )}

        {/* Guest view */}
        {isGuest && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[rgb(var(--muted))]">
              Welcome, Guest!
            </span>
            <Link
              href={client.urls.signIn ?? "/handler/sign-in"}
              className="rounded-full border border-[#d6e4ea] bg-gradient-to-r from-[#E5623A] to-[#F1C04F] px-3 py-1 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
