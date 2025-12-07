"use client";

import PlacesMapCard from "@/components/PlacesMapCard";

/**
 * Ribbon
 * ---------------------------------------------------
 * Small section header displayed at the top of the map card.
 */
function Ribbon({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-sm font-semibold text-brand-dusk dark:text-white">
      {children}
    </div>
  );
}

/**
 * Card
 * ---------------------------------------------------
 * Shared card-style container used for the map section.
 */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[rgba(var(--card-border),0.7)] bg-[rgb(var(--card))] p-5 shadow-panel">
      {children}
    </div>
  );
}

/**
 * PartyMap
 * ---------------------------------------------------
 * Displays a map of nearby restaurants for party mode.
 *
 * Notes:
 * - Location is approximate and derived by PlacesMapCard.
 * - This component is purely presentational and holds no local state.
 */
export default function PartyMap() {
  return (
    <Card>
      <Ribbon>Eat Outside</Ribbon>
      <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
        Shows restaurants based on your approximate location.
      </p>
      <PlacesMapCard height={300} />
    </Card>
  );
}
