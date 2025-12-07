"use client";

import { Crown } from "lucide-react";
import { z } from "zod";
import { PrefsSchema, DietEnum } from "@/lib/party";

interface Peer {
  id: string;
  nickname: string;
  creator: boolean;
  lastSeen: number;
}

interface PartySidebarProps {
  livePeers: Peer[];
  hostId: string | null;
  memberId: string | null;
  prefs: z.infer<typeof PrefsSchema>;
  allergenOptions: string[];
  onPrefChange: (next: Partial<z.infer<typeof PrefsSchema>>) => void;
}

/**
 * ToggleChip
 * ---------------------------------------------------
 * Reusable pill-style toggle button.
 * Used for diet selection and allergen chips.
 */
function ToggleChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-transparent bg-gradient-to-r from-brand-coral to-brand-gold text-brand-dusk shadow-glow"
          : "border-[rgba(var(--card-border),0.8)] bg-[rgb(var(--card))] text-brand-dusk hover:border-brand-gold/80 dark:text-white/80 dark:hover:text-white",
      ].join(" ")}
      aria-pressed={!!active}
    >
      {children}
    </button>
  );
}

/**
 * Ribbon
 * ---------------------------------------------------
 * Small section header used at the top of each sidebar card.
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
 * Shared card-style container for sidebar sections.
 */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[rgba(var(--card-border),0.7)] bg-[rgb(var(--card))] p-5 shadow-panel">
      {children}
    </div>
  );
}

/**
 * PartySidebar
 * ---------------------------------------------------
 * Right-hand sidebar for party mode:
 * - Shows live members (host, self, others) with simple presence styling.
 * - Lets the current user update their party preferences:
 *   - Diet (via DietEnum options).
 *   - Allergens (from provided allergenOptions list).
 * - Emits partial PrefsSchema updates back to the parent via onPrefChange.
 */
export default function PartySidebar({
  livePeers,
  hostId,
  memberId,
  prefs,
  allergenOptions,
  onPrefChange,
}: PartySidebarProps) {
  return (
    <>
      {/* Members Card */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <Ribbon>Members</Ribbon>
          <div className="text-xs text-neutral-600 dark:text-neutral-300">
            {livePeers.length} online
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {livePeers.map((p) => {
            const tone =
              p.id === hostId ? "host" : p.id === memberId ? "self" : "default";
            return (
              <span
                key={p.id}
                className={[
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                  tone === "host"
                    ? "bg-orange-500 text-black border-orange-400"
                    : tone === "self"
                    ? "bg-sky-500 text-black border-sky-400"
                    : "bg-neutral-100 text-neutral-900 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700",
                ].join(" ")}
              >
                {tone === "host" && <Crown className="h-3 w-3" />} {p.nickname}
                {p.id === memberId ? " (you)" : ""}
              </span>
            );
          })}
        </div>
      </Card>

      {/* Preferences Card */}
      <Card>
        <Ribbon>Your preferences</Ribbon>

        {/* Diet selection */}
        <div className="mb-1 text-xs text-neutral-600 dark:text-neutral-300">
          Diet
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {DietEnum.options.map((d) => (
            <ToggleChip
              key={d}
              active={prefs.diet === d}
              onClick={() => onPrefChange({ diet: d })}
            >
              {d}
            </ToggleChip>
          ))}
        </div>

        {/* Allergen selection */}
        <div className="mb-1 text-xs text-neutral-600 dark:text-neutral-300">
          Allergens
        </div>
        <div className="flex flex-wrap gap-2">
          {allergenOptions.map((a) => {
            const active = (prefs.allergens ?? []).includes(a);
            return (
              <ToggleChip
                key={a}
                active={active}
                onClick={() => {
                  const set = new Set(prefs.allergens ?? []);
                  if (active) {
                    set.delete(a);
                  } else {
                    set.add(a);
                  }
                  onPrefChange({ allergens: Array.from(set) });
                }}
              >
                {a.replace("_", " ")}
              </ToggleChip>
            );
          })}
        </div>
      </Card>
    </>
  );
}
