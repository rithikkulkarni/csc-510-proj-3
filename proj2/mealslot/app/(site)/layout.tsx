// --- path: app/(site)/layout.tsx ---
import type { ReactNode } from "react";
import SiteNav from "@/components/SiteNav";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-slate-50 to-neutral-100 text-neutral-900">
      {/* Top navigation (handles its own sticky header) */}
      <SiteNav />

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
