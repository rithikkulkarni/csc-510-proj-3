// --- path: app/(site)/party/page.tsx ---
"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import PartyClient from "@/components/PartyClient";

// -------------------------
// Shared visual tokens (match home page)
// -------------------------
const shellClass =
  "min-h-screen bg-gradient-to-b from-neutral-50 via-slate-50 to-neutral-100 px-4 py-6 md:px-8 lg:px-16";

const contentClass =
  "mx-auto flex w-full max-w-5xl flex-col gap-5 pb-10";

const cardClass =
  "rounded-2xl border border-neutral-200/80 bg-white/80 backdrop-blur-sm p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]";

function PartyPageInner() {
  // Optional: support /party?code=ABC123 for quick join
  const sp = useSearchParams();
  const code = useMemo(() => {
    const raw = sp.get("code") ?? "";
    return raw.toUpperCase().slice(0, 6);
  }, [sp]);

  return (
    <div className={shellClass}>
      <div className={contentClass}>
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">
            Party Mode
          </h1>
          <p className="max-w-xl text-sm md:text-base text-neutral-600">
            Spin together with friends in real time. Share a party code, lock in
            favorites, and vote on what to eat.
          </p>
        </header>

        <section className={cardClass}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base md:text-lg font-semibold text-neutral-900">
              Party lobby
            </h2>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-700">
              Live group spin
            </span>
          </div>

          {/* PartyClient handles Create/Join and shows the active code */}
          <PartyClient code={code} />
        </section>
      </div>
    </div>
  );
}

export default function PartyPage() {
  return (
    <Suspense
      fallback={
        <div className={shellClass}>
          <div className={contentClass}>
            <header className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">
                Party Mode
              </h1>
              <p className="max-w-xl text-sm md:text-base text-neutral-600">
                Loading your party lobby…
              </p>
            </header>

            <section className={cardClass}>
              <div className="h-40 animate-pulse rounded-xl bg-neutral-100" />
            </section>
          </div>
        </div>
      }
    >
      <PartyPageInner />
    </Suspense>
  );
}
