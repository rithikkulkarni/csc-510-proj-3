"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PartyClient from "@/components/PartyClient";

import {
  shellClass,
  contentClass,
  cardClass,
  sectionTitleClass,
  sectionSubtitleClass,
} from "@/components/ui/style";

export default function PartyPage() {
  const sp = useSearchParams();

  // Read initial code from ?code=XYZ
  const initialCode = useMemo(
    () => (sp.get("code") ?? "").toUpperCase().slice(0, 6),
    [sp]
  );

  // Local state — this is what the page displays
  const [partyCode, setPartyCode] = useState(initialCode);

  return (
    <div className={shellClass}>
      <div className={contentClass}>

        {/* Header */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900">
              Party Mode
            </h1>
            <p className="text-sm md:text-base text-neutral-600">
              Join friends, sync picks, and play MealSlot together.
            </p>
          </div>
        </header>

        {/* Code Section */}
        <section className={cardClass}>
          <h2 className={sectionTitleClass}>Your Party Code</h2>
          <p className={sectionSubtitleClass}>
            Share this code with others to sync meal picks.
          </p>

          <div className="mt-4 p-4 rounded-xl border bg-neutral-50 flex items-center justify-center">
            <span className="text-3xl font-bold tracking-widest text-neutral-900">
              {partyCode || "------"}
            </span>
          </div>

          <div className="mt-6">
            {/* Pass callback so PartyClient can update header */}
            <PartyClient code={partyCode} onCodeChange={setPartyCode} />
          </div>
        </section>

      </div>
    </div>
  );
}
