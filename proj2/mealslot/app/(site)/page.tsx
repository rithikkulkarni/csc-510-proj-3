"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { SlotMachine } from "@/components/SlotMachine";
import { PowerUps } from "@/components/PowerUps";
import FilterMenu from "@/components/FilterMenu";

import { Dish, PowerUpsInput, RecipeJSON } from "@/lib/schemas";
import { cn } from "@/components/ui/cn";
import Modal from "@/components/ui/Modal";
import MapWithPins from "@/components/MapWithPins";
import VideoPanel, { Video } from "@/components/VideoPanel";
import { getUserDetails, getAllAllergens, updateUserDetails } from "../actions";
import {
  shellClass,
  contentClass,
  cardClass,
  sectionTitleClass,
  sectionSubtitleClass,
  categoryPillBase,
} from "../../components/ui/style";
import { client } from "@/stack/client";

// -------------------------
// Types
// -------------------------
type Venue = {
  id: string;
  name: string;
  addr: string;
  rating: number;
  price: string;
  url: string;
  cuisine: string;
  distance_km: number;
};
type User = {
  name: string;
  id?: string;
  auth_id?: string | null;
  allergens?: string[];
  savedMeals?: string[];
};

// -------------------------
// HomePage
// -------------------------
/**
 * HomePage (Solo mode)
 * ---------------------------------------------------
 * Main entry for the solo MealSlot experience:
 * - Loads user (Stack/Neon, cached profile, or guest).
 * - Manages filters, power-ups, and saved meals.
 * - Calls /api/spin to generate dish selections.
 * - Integrates with /api/videos for recipe videos.
 * - Integrates with /api/places for nearby venues.
 */
function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const DISH_COUNT = 3; // Fixed at 3 for actual slot machine behavior

  const [slotCategories, setSlotCategories] = useState<string[]>([
    "Breakfast",
    "Lunch",
    "Dinner",
  ]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [savedMeals, setSavedMeals] = useState<string[]>([]);
  const [allCategories] = useState<string[]>([
    "Breakfast",
    "Lunch",
    "Dinner",
    "Dessert",
    "Snack",
  ]);
  const [powerups, setPowerups] = useState<PowerUpsInput>({});
  const [selection, setSelection] = useState<Dish[]>([]);
  const [busy, setBusy] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [recipes, setRecipes] = useState<RecipeJSON[] | null>(null);
  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [openVideoModal, setOpenVideoModal] = useState(false);
  const [videosByDish, setVideosByDish] = useState<Record<string, Video[]>>({});

  // -------------------------
  // Load user (Neon Auth or Guest)
  // -------------------------
  useEffect(() => {
    async function fetchUser() {
      // Prefer a cached profile from localStorage for snappy reloads
      const savedProfile = localStorage.getItem("userProfile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setUser(parsed);
        setSelectedAllergens(
          Array.isArray(parsed?.allergens) ? parsed.allergens : []
        );
        setSavedMeals(
          Array.isArray(parsed?.savedMeals) ? parsed.savedMeals : []
        );
        return;
      }

      // Otherwise, look up the authenticated Stack/Neon user and hydrate profile
      const neonUser = await client.getUser();
      if (neonUser) {
        const profile = await getUserDetails(neonUser.id);
        if (profile) {
          setUser(profile);
          setSelectedAllergens(
            Array.isArray(profile.allergens) ? profile.allergens : []
          );
          setSavedMeals(
            Array.isArray(profile.savedMeals) ? profile.savedMeals : []
          );
          localStorage.setItem("userProfile", JSON.stringify(profile));
        }
      } else if (localStorage.getItem("guestUser")) {
        // Guest mode: lightweight identity with no persistence
        setUser({ name: "Guest" });
      }
    }

    fetchUser();
  }, []);

  /**
   * Enable guest mode for users without an authenticated account.
   * Persists a small flag so subsequent reloads remember the guest state.
   */
  const handleGuest = () => {
    localStorage.setItem("guestUser", "true");
    setUser({ name: "Guest" });
  };

  /**
   * Clear both guest and authenticated profile information locally.
   * Does not sign out from the auth provider itself, only local app state.
   */
  const handleSignOut = () => {
    localStorage.removeItem("guestUser");
    localStorage.removeItem("userProfile"); // clear Neon Auth profile
    localStorage.removeItem("savedMeals"); // clear local saved meals cache so hearts reset
    setUser(null);
    setSavedMeals([]);
  };

  /**
   * Toggle a dish ID in the savedMeals list.
   * - Performs an optimistic UI update and keeps localStorage in sync.
   * - For authenticated users, persists to the DB via updateUserDetails.
   */
  const toggleSavedMeal = async (dish: Dish) => {
    const next = (() => {
      if (savedMeals.includes(dish.id)) {
        return savedMeals.filter((id) => id !== dish.id);
      }
      return [...savedMeals, dish.id];
    })();

    // Optimistic update
    setSavedMeals(next);
    localStorage.setItem("savedMeals", JSON.stringify(next));

    // Keep cached profile in sync if it exists
    const cached = localStorage.getItem("userProfile");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        parsed.savedMeals = next;
        localStorage.setItem("userProfile", JSON.stringify(parsed));
      } catch (e) {
        console.warn("Failed to sync saved meals to cached profile", e);
      }
    }

    // Persist to DB for authenticated users
    // Get the actual authenticated user ID from Stack, not cached profile
    try {
      const stackUser = await client.getUser();
      console.log("toggleSavedMeal: stackUser.id =", stackUser?.id);
      if (stackUser?.id) {
        const updated = await updateUserDetails(stackUser.id, { savedMeals: next });
        console.log("toggleSavedMeal: updated.savedMeals =", updated?.savedMeals);
        if (updated?.savedMeals) {
          setSavedMeals(updated.savedMeals);
          setUser((prev) =>
            prev ? { ...prev, savedMeals: updated.savedMeals } : prev
          );
          localStorage.setItem(
            "userProfile",
            JSON.stringify({
              ...(cached ? JSON.parse(cached) : {}),
              savedMeals: updated.savedMeals,
            })
          );
        }
      } else {
        console.warn("toggleSavedMeal: no authenticated user found");
      }
    } catch (err) {
      console.error("Failed to persist saved meals", err);
    }
  };

  // -------------------------
  // Derived cuisines
  // -------------------------
  /**
   * Derive cuisines to query venues by:
   * - Use selected dish names when a selection exists.
   * - Otherwise fall back to a few generic cuisines.
   */
  const cuisines = useMemo(() => {
    const names = selection.map((d) => d.name).filter(Boolean);
    return names.length ? names : ["american", "asian", "italian"];
  }, [selection]);

  // -------------------------
  // Cooldown timer
  // -------------------------
  useEffect(() => {
    let t: number | undefined;
    if (cooldownMs > 0) {
      t = window.setInterval(
        () => setCooldownMs((ms) => Math.max(0, ms - 250)),
        250
      );
    }
    return () => {
      if (t) clearInterval(t);
    };
  }, [cooldownMs]);

  // -------------------------
  // Slot machine spin & other logic
  // -------------------------
  /**
   * Deduplicate dish selections (by id, or name+category fallback)
   * to avoid showing the same dish multiple times across slots.
   */
  const dedupeSelection = (items: Dish[]) => {
    const seen = new Set<string>();
    return items.filter((d) => {
      const key = d?.id || `${d?.name}-${d?.category}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  /**
   * Request a new spin from /api/spin and hydrate the UI with:
   * - Unique selection.
   * - Reset recipes/venues.
   * - Trigger cooldown and video lookup.
   */
  const onSpin = async (locked: { index: number; dishId: string }[]) => {
    setBusy(true);
    const res = await fetch("/api/spin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categories: slotCategories, // array of categories per slot
        tags: selectedTags,
        allergens: selectedAllergens,
        locked,
        powerups,
        dishCount: DISH_COUNT,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Spin failed: ${j.message ?? res.status}`);
      return;
    }
    const data = await res.json();
    const uniqueSelection = dedupeSelection(data.selection ?? []);
    setSelection(uniqueSelection);
    setRecipes(null);
    setVenues(null);
    setOpenVideoModal(false);
    setCooldownMs(3000);
    await fetchVideos(uniqueSelection);
  };

  // Fetch videos
  /**
   * Fetch recipe videos for the given dishes via /api/videos.
   * Populates videosByDish used by VideoPanel.
   */
  const fetchVideos = async (dishes: Dish[]) => {
    if (!dishes.length) return;
    const res = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dishes: dishes.map((d) => d.name) }),
    });
    const data = await res.json();
    if (res.ok) setVideosByDish(data.results);
  };

  // Fetch venues
  /**
   * Fetch nearby venues for the derived cuisines via /api/places.
   * - Uses geolocation coordinates when provided.
   * - Falls back to a city-level hint (Denver) otherwise.
   */
  const fetchVenues = async (coords?: { lat: number; lng: number }) => {
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
    else if (j.results && typeof j.results === "object")
      normalized = Object.values(j.results).flat();
    else if (Array.isArray(j)) normalized = j;
    setVenues(normalized);
  };

  // -------------------------
  // JSX
  // -------------------------
  return (
    <div className={shellClass}>
      <div className={contentClass}>
        <header className={cn(cardClass, "flex flex-col gap-3")}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-dusk/80 dark:text-brand-glow/90">
            <span className="rounded-full bg-gradient-to-r from-brand-coral to-brand-gold px-2 py-1 text-brand-dusk shadow-soft">
              Solo
            </span>
            <span>Spin &amp; Savor</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-semibold text-brand-dusk dark:text-white">
              What should we eat today?
            </h1>
            <p className="text-sm md:text-base text-brand-dusk/80 dark:text-brand-glow/80">
              Spin the reels, lock your favorites, and let MealSlot pick your
              next bite—cook at home or find a spot nearby.
            </p>
          </div>
        </header>

        {/* Category selection - now handled per-slot */}
        <section className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={sectionTitleClass}>Categories</h2>
            <span className="rounded-full bg-gradient-to-r from-brand-coral to-brand-gold px-3 py-1 text-xs font-semibold text-brand-dusk shadow-soft">
              Step 1 · Customize each slot
            </span>
          </div>
          <p className="mt-2 text-sm text-brand-dusk/70 dark:text-brand-glow/80">
            Pick a category for each slot above the reels below, or use the
            quick presets:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className={cn(
                categoryPillBase,
                "text-brand-dusk hover:border-brand-gold/80 dark:text-white/80"
              )}
              onClick={() =>
                setSlotCategories(["Breakfast", "Lunch", "Dinner"])
              }
            >
              🍳 Full Day
            </button>
            <button
              className={cn(
                categoryPillBase,
                "text-brand-dusk hover:border-brand-gold/80 dark:text-white/80"
              )}
              onClick={() =>
                setSlotCategories(["Dinner", "Dinner", "Dessert"])
              }
            >
              🍽️ Dinner + Dessert
            </button>
            <button
              className={cn(
                categoryPillBase,
                "text-brand-dusk hover:border-brand-gold/80 dark:text-white/80"
              )}
              onClick={() => setSlotCategories(["Lunch", "Lunch", "Lunch"])}
            >
              🥗 All Lunch
            </button>
            <button
              className={cn(
                categoryPillBase,
                "text-brand-dusk hover:border-brand-gold/80 dark:text-white/80"
              )}
              onClick={() =>
                setSlotCategories(["Dessert", "Dessert", "Dessert"])
              }
            >
              🍰 All Desserts
            </button>
            <button
              className={cn(
                categoryPillBase,
                "text-brand-dusk hover:border-brand-gold/80 dark:text-white/80"
              )}
              onClick={() => setSlotCategories(["Snack", "Snack", "Snack"])}
            >
              🍿 All Snacks
            </button>
          </div>
        </section>

        {/* Filters / power-ups */}
        <section className={cardClass}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="w-full md:w-2/3 space-y-4">
              <h2 className={sectionTitleClass}>Filters</h2>
              <FilterMenu
                onTagChange={setSelectedTags}
                onAllergenChange={setSelectedAllergens}
              />
            </div>
            <div className="w-full md:w-1/3 space-y-4 border-t border-dashed border-neutral-200 pt-4 md:border-l md:border-t-0 md:pl-4">
              <h3 className="text-sm font-semibold text-brand-dusk dark:text-white">
                Power-Ups
              </h3>
              <p className={sectionSubtitleClass}>
                Give the slot machine a nudge: healthier options, cheaper picks,
                or faster meals.
              </p>
              <PowerUps value={powerups} onChange={setPowerups} />
            </div>
          </div>
        </section>

        {/* Slot Machine */}
        <section className={cardClass}>
          <div className="flex flex-col gap-4">
            <div className="space-y-3">
              <h2 className={sectionTitleClass}>Spin the Slots</h2>
              <p className={sectionSubtitleClass}>
                Lock your favorites and spin again to explore more options.
              </p>
            </div>
            <SlotMachine
              reelCount={DISH_COUNT}
              onSpin={onSpin}
              cooldownMs={cooldownMs}
              busy={busy}
              hasCategory={true}
              savedMeals={savedMeals}
              onToggleSave={toggleSavedMeal}
              selection={selection}
              slotCategories={slotCategories}
              onCategoryChange={(index, cat) => {
                const next = [...slotCategories];
                next[index] = cat;
                setSlotCategories(next);
              }}
            />
          </div>
        </section>

        {/* Selected dishes + actions */}
        {selection.length > 0 && (
          <section
            className={cn(cardClass, "animate-[fadeInUp_180ms_ease-out]")}
          >
            <h2 className={sectionTitleClass}>Selected Dishes</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-brand-dusk/90 dark:text-brand-glow/90">
              {selection.map((d) => (
                <li key={d.id} className="flex items-baseline gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500" />
                  <div>
                    <span className="font-semibold text-brand-dusk dark:text-white">
                      {d.name}
                    </span>{" "}
                    <span className="text-xs uppercase tracking-wide text-brand-dusk/60 dark:text-brand-glow/70">
                      ({d.category})
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="btn-primary text-xs px-4 py-2"
                onClick={() => setOpenVideoModal(true)}
              >
                🍳 Cook at Home
              </button>
              <button
                className="btn-ghost text-xs px-4 py-2"
                onClick={() => {
                  if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) =>
                        fetchVenues({
                          lat: pos.coords.latitude,
                          lng: pos.coords.longitude,
                        }),
                      () => fetchVenues(),
                      { maximumAge: 1000 * 60 * 5, timeout: 10000 }
                    );
                  } else {
                    fetchVenues();
                  }
                }}
              >
                📍 Eat Outside
              </button>
            </div>
          </section>
        )}

        {/* Recipes modal */}
        <Modal
          open={openVideoModal && !!videosByDish}
          title="Cook at Home — Recipes"
          onClose={() => setOpenVideoModal(false)}
        >
          <VideoPanel videosByDish={videosByDish} />
        </Modal>

        {/* Eat outside section - only shown after dishes are selected */}
        {selection.length > 0 && (
          <section id="outside" className={cardClass}>
            <h2 className={sectionTitleClass}>Eat Outside</h2>
            <p className={sectionSubtitleClass}>
              Shows stubbed venues; "Using city-level location."
            </p>

            {venues ? (
              <>
                <div
                  className="mt-4 grid gap-3 md:grid-cols-2"
                  aria-label="Venue list"
                >
                  {venues.map((v) => (
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
                      <div className="mt-1 text-sm text-brand-dusk/80 dark:text-brand-glow/85">
                        {v.addr}
                      </div>
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
                <div className="mt-4 overflow-hidden rounded-2xl border border-brand-aqua/50 shadow-soft">
                  <MapWithPins venues={venues} />
                </div>
              </>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-brand-aqua/50 bg-[rgb(var(--card))] px-4 py-6 text-sm font-semibold text-brand-dusk dark:text-white">
                Click{" "}
                <span className="font-bold text-brand-coral dark:text-brand-gold">
                  "📍 Eat Outside"
                </span>{" "}
                above to see nearby places that match your dishes.
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// Client-only dynamic import
export default dynamic(() => Promise.resolve(HomePage), { ssr: false });
