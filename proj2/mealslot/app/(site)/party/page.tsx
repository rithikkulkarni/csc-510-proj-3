"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import PartyClient from "@/components/PartyClient";
import { cn } from "@/components/ui/cn";
import { useUser } from "@/app/context/UserContext";

import {
  shellClass,
  contentClass,
  cardClass,
  sectionTitleClass,
  sectionSubtitleClass,
} from "@/components/ui/style";

/**
 * PartyPage
 * ---------------------------------------------------
 * Entry point for "Party Mode" in the meal slot app.
 * - Lets users create or join a party using a 6-character code.
 * - Connects to PartyClient for real-time party behavior.
 * - After a spin, optionally fetches and shows nearby venues.
 */
export default function PartyPage() {
  const sp = useSearchParams();
  const { user } = useUser();

  // Initial party code from URL (?code=XYZ123), normalized to 6 uppercase chars
  const initialCode = useMemo(
    () => (sp.get("code") ?? "").toUpperCase().slice(0, 6),
    [sp]
  );

  const [partyCode, setPartyCode] = useState(initialCode);
  const [nickname, setNickname] = useState<string>("");
  const [activeCode, setActiveCode] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [creatorMemberId, setCreatorMemberId] = useState<string | null>(null);
  const [venues, setVenues] = useState<any[] | null>(null);
  const [spinOccurred, setSpinOccurred] = useState(false);

  // Load saved nickname on mount (if available)
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("mealslot_nickname");
      if (saved) setNickname(saved);
    } catch {
      // Ignore localStorage errors in restricted environments
    }
  }, []);

  /**
   * Create a new party for the current user.
   * - Requires a non-empty nickname.
   * - Calls /api/party/create with nickname and auth_id.
   * - On success, sets the new code as active and marks this user as creator.
   */
  const handleCreate = useCallback(async () => {
    if (!nickname.trim()) return alert("Please enter your name first");

    const r = await fetch("/api/party/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname, auth_id: user?.auth_id })
    });
    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Create failed");

    setPartyCode(j.code);
    setActiveCode(j.code);
    setIsCreator(true);
    setCreatorMemberId(j.memberId);
  }, [nickname, user?.auth_id]);

  /**
   * Join an existing party using the current partyCode.
   * - Requires a non-empty nickname.
   * - Validates that the code is exactly 6 characters.
   * - Calls /api/party/join and activates the session on success.
   */
  const handleJoin = useCallback(async () => {
    if (!nickname.trim()) return alert("Please enter your name first");
    if (!partyCode || partyCode.length !== 6) return alert("Enter a 6-character code");

    const r = await fetch("/api/party/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: partyCode, nickname, auth_id: user?.auth_id })
    });
    const j = await r.json();
    if (!r.ok) return alert(j?.error || "Join failed");

    setActiveCode(partyCode);
    setIsCreator(false);
  }, [partyCode, nickname, user?.auth_id]);

  /**
   * Leave the current party.
   * Resets local party state and reloads the page to clear any
   * party-related client state (e.g., sockets managed inside PartyClient).
   */
  const handleLeave = useCallback(() => {
    setActiveCode("");
    setPartyCode("");
    setIsCreator(false);
    setCreatorMemberId(null);
    window.location.reload();
  }, []);

  /**
   * Copy the current party code to the clipboard.
   */
  const handleCopyCode = useCallback(() => {
    if (partyCode) {
      navigator.clipboard.writeText(partyCode);
    }
  }, [partyCode]);

  /**
   * Fetch venues for the "Eat Outside" section.
   * - If coords are provided, uses them; otherwise falls back to a location hint.
   * - Normalizes different response shapes into a flat venues array.
   */
  const fetchVenues = useCallback(async (coords?: { lat: number; lng: number }) => {
    const cuisines = ["american", "asian", "italian"]; // Temporary default cuisines
    const body: any = { cuisines };
    if (coords) {
      body.lat = coords.lat;
      body.lng = coords.lng;
    } else {
      body.locationHint = "Denver";
    }

    const r = await fetch("/api/places", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const j = await r.json();
    let normalized: any[] = [];
    if (Array.isArray(j.venues)) normalized = j.venues;
    else if (j.results && typeof j.results === "object") normalized = Object.values(j.results).flat();
    else if (Array.isArray(j)) normalized = j;
    setVenues(normalized);
  }, []);

  return (
    <div className={shellClass}>
      <div className={contentClass}>

        {/* Header */}
        <header className={cn(cardClass, "flex flex-col gap-3 mb-4")}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-dusk/80 dark:text-brand-glow/90">
            <span className="rounded-full bg-gradient-to-r from-brand-coral to-brand-gold px-2 py-1 text-brand-dusk shadow-soft">Party</span>
            <span>Sync &amp; Spin</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-semibold text-brand-dusk dark:text-white">
              Party Mode
            </h1>
            <p className="text-sm md:text-base text-brand-dusk/80 dark:text-brand-glow/80">
              Team up, lock in picks, and spin together with the same vibrant slot vibes as solo mode.
            </p>
          </div>
        </header>

        {/* Code & Setup Section */}
        <section className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={sectionTitleClass}>Your Party Code</h2>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">Step 1 · Share</span>
          </div>
          <p className={sectionSubtitleClass}>
            Share this with friends so you all spin the same wheel.
          </p>

          {/* Code Input Box */}
          <div className="mt-6">
            <div className="rounded-2xl border-2 border-brand-gold/30 bg-gradient-to-r from-[#faf9f7] to-[#f5f3f0] p-5 shadow-soft dark:from-[#f8f7f5] dark:to-[#f0ebe5] relative">
              <input
                type="text"
                value={partyCode}
                onChange={(e) => setPartyCode(e.currentTarget.value.toUpperCase().slice(0, 6))}
                placeholder="------"
                className="w-full text-center text-3xl font-black tracking-[0.35em] text-brand-coral bg-transparent border-none outline-none placeholder-brand-coral/30 dark:placeholder-brand-coral/40"
                maxLength={6}
              />
              {partyCode && (
                <button
                  onClick={handleCopyCode}
                  className="absolute top-3 right-3 rounded-full border border-brand-gold/50 bg-white/80 dark:bg-neutral-800/80 px-3 py-1 text-xs font-medium text-brand-dusk dark:text-white hover:bg-brand-gold/20 transition-colors"
                  title="Copy code"
                >
                  Copy
                </button>
              )}
              <div className="mt-3 text-xs text-brand-dusk/70 dark:text-brand-dusk/80">
                Enter a party code here to join, or create a new party.
              </div>
            </div>

            {/* Name Input + Create/Join Buttons Row */}
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              {/* Name Input (also persisted to localStorage) */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-brand-dusk dark:text-white whitespace-nowrap">Your Name:</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    const val = e.currentTarget.value.slice(0, 24);
                    setNickname(val);
                    try { localStorage.setItem("mealslot_nickname", val); } catch { }
                  }}
                  placeholder="Enter your name"
                  maxLength={24}
                  className="flex-1 rounded-lg border-2 border-brand-gold/40 bg-[rgb(var(--card))] px-4 py-2 text-sm text-brand-dusk dark:text-white focus:border-brand-gold focus:outline-none shadow-sm"
                />
              </div>

              {/* Create Button (only when not already in a party) */}
              {!activeCode && (
                <div className="flex flex-col justify-end">
                  <button
                    onClick={handleCreate}
                    className="rounded-lg border-2 border-brand-coral bg-gradient-to-r from-brand-coral to-brand-gold px-6 py-2 text-sm font-bold text-brand-dusk shadow-glow transition-all hover:shadow-lg disabled:opacity-50 whitespace-nowrap"
                    disabled={partyCode.length > 0 || !nickname.trim()}
                    title="Create a new party"
                  >
                    Create
                  </button>
                </div>
              )}

              {/* Join or Leave Button */}
              <div className="flex flex-col justify-end">
                {activeCode && isCreator ? (
                  <button
                    onClick={handleLeave}
                    className="rounded-lg border-2 border-red-500 bg-gradient-to-r from-red-500 to-red-600 px-6 py-2 text-sm font-bold text-white shadow-glow transition-all hover:shadow-lg whitespace-nowrap"
                    title="Leave party and refresh"
                  >
                    Leave
                  </button>
                ) : (
                  <button
                    onClick={handleJoin}
                    className="rounded-lg border-2 border-brand-gold bg-gradient-to-r from-brand-gold to-brand-coral px-6 py-2 text-sm font-bold text-brand-dusk shadow-glow transition-all hover:shadow-lg disabled:opacity-50 whitespace-nowrap"
                    disabled={partyCode.length !== 6 || !nickname.trim() || !!activeCode}
                    title="Join an existing party"
                  >
                    Join
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Party Client (real-time spin coordination) */}
          {activeCode && (
            <div className="mt-6">
              <PartyClient
                code={activeCode}
                onCodeChange={setActiveCode}
                initialNickname={nickname}
                skipAutoJoin={isCreator}
                initialMemberId={creatorMemberId}
                onSpin={() => setSpinOccurred(true)}
              />
            </div>
          )}
        </section>

        {/* Eat Outside Section - only show after a spin */}
        {spinOccurred && (
          <section id="outside" className={cardClass}>
            <h2 className={sectionTitleClass}>Eat Outside</h2>
            <p className={sectionSubtitleClass}>
              Find nearby restaurants that match your party's selections.
            </p>

            {venues ? (
              <div
                className="mt-4 grid gap-3 md:grid-cols-2"
                aria-label="Venue list"
              >
                {venues.map((v: any) => (
                  <div
                    key={v.id}
                    className="rounded-xl border border-brand-aqua/50 bg-[rgb(var(--card))] p-3 shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-gold hover:shadow-panel"
                  >
                    <div className="mb-1 text-base font-bold text-brand-dusk dark:text-white">
                      {v.name}
                    </div>
                    <div className="text-sm font-semibold text-brand-dusk/90 dark:text-brand-glow">
                      {v.cuisine} • {v.price} • {v.rating.toFixed(1)}★ •{" "}
                      {v.distance_km} km
                    </div>
                    <div className="mt-1 text-sm text-brand-dusk/80 dark:text-brand-glow/85">{v.addr}</div>
                    <a
                      className="mt-2 inline-block text-sm font-bold text-brand-coral hover:text-brand-dusk dark:text-brand-gold dark:hover:text-white underline-offset-2 hover:underline"
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Visit website
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-dashed border-brand-aqua/50 bg-[rgb(var(--card))] px-4 py-6 text-sm font-semibold text-brand-dusk dark:text-white">
                  Spin the party slot machine, then click{" "}
                  <span className="font-bold text-brand-coral dark:text-brand-gold">
                    "Eat Outside"
                  </span>{" "}
                  below to see nearby places that match your dishes.
                </div>
                <button
                  className="btn-ghost text-xs px-4 py-2"
                  onClick={() => {
                    // Prefer geolocation; fall back to generic search on error
                    if ("geolocation" in navigator) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) =>
                          fetchVenues({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                          }),
                        () => fetchVenues(),
                        { maximumAge: 1000 * 60 * 5, timeout: 10000 },
                      );
                    } else {
                      fetchVenues();
                    }
                  }}
                >
                  📍 Eat Outside
                </button>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
