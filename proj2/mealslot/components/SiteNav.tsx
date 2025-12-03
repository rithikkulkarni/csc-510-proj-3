// --- path: components/SiteNav.tsx ---
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "./ui/cn";

export default function SiteNav() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/party", label: "Party Mode" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Left: brand + nav links */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-neutral-900">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-[11px] text-white shadow-sm">
              MS
            </span>
            <span className="hidden sm:inline-block">MealSlot</span>
          </div>

          <div className="flex items-center gap-1 rounded-full bg-neutral-100/80 p-1">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ease-out",
                    "hover:-translate-y-0.5 hover:shadow-sm",
                    active
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-600 hover:bg-white/80",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: theme toggle */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
