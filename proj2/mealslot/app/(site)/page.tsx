"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { SlotMachine } from "@/components/SlotMachine";
import { PowerUps } from "@/components/PowerUps";
import FilterMenu from "@/components/FilterMenu";
import DishCountInput from "@/components/DishCountInput";
import { Dish, PowerUpsInput, RecipeJSON } from "@/lib/schemas";
import { cn } from "@/components/ui/cn";
import Modal from "@/components/ui/Modal";
import MapWithPins from "@/components/MapWithPins";
import VideoPanel, { Video } from "@/components/VideoPanel";
import { client } from "@/stack/client";
import { getUserDetails, getAllAllergens } from "../actions";
import {
  shellClass,
  contentClass,
  cardClass,
  sectionTitleClass,
  sectionSubtitleClass,
  categoryPillBase,
} from "../../components/ui/style";

// Canonical categories
const CATEGORY_OPTIONS = ["breakfast", "lunch", "dinner", "dessert"] as const;

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
type User = { name: string };

// -------------------------
// HomePage
// -------------------------
function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [category, setCategory] = useState<string>("breakfast");
  const [dishCount, setDishCount] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [allAllergens, setAllAllergens] = useState<string[]>([]);
  const [allCategories] = useState<string[]>(["Breakfast", "Lunch", "Dinner", "Dessert"]);
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
      const neonUser = await client.getUser();
      if (neonUser) {
        const profile = await getUserDetails(neonUser.id);
        setUser({ name: profile?.name || "User" });
      } else if (localStorage.getItem("guestUser")) {
        setUser({ name: "Guest" });
      }
    }
    fetchUser();
  }, []);

  // -------------------------
  // Load all allergens
  // -------------------------
  useEffect(() => {
    async function fetchAllergens() {
      const allergens = await getAllAllergens();
      setAllAllergens(allergens);
    }
    fetchAllergens();
  }, []);

  const handleGuest = () => {
    localStorage.setItem("guestUser", "true");
    setUser({ name: "Guest" });
  };

  const handleSignOut = () => {
    localStorage.removeItem("guestUser");
    setUser(null);
  };

  // -------------------------
  // Derived cuisines
  // -------------------------
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
      t = window.setInterval(() => setCooldownMs((ms) => Math.max(0, ms - 250)), 250);
    }
    return () => {
      if (t) clearInterval(t);
    };
  }, [cooldownMs]);

  // -------------------------
  // Slot machine spin & other logic
  // -------------------------
  const onSpin = async (locked: { index: number; dishId: string }[]) => {
    setBusy(true);
    const res = await fetch("/api/spin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category,
        tags: selectedTags,
        allergens: selectedAllergens,
        locked,
        powerups,
        dishCount,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Spin failed: ${j.message ?? res.status}`);
      return;
    }
    const data = await res.json();
    setSelection(data.selection);
    setRecipes(null);
    setVenues(null);
    setOpenVideoModal(false);
    setCooldownMs(3000);
    await fetchVideos(data.selection);
  };

  // Fetch videos
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
    else if (j.results && typeof j.results === "object") normalized = Object.values(j.results).flat();
    else if (Array.isArray(j)) normalized = j;
    setVenues(normalized);
  };

  // -------------------------
  // JSX
  // -------------------------
  return (
    <div className={shellClass}>
      <div className={contentClass}>
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900">
              What should we eat today?
            </h1>
            <p className="text-sm md:text-base text-neutral-600">
              Spin the slots, tweak your filters, and let MealSlot pick your next meal—
              cook at home or find a spot nearby.
            </p>
          </div>
        </header>

        {/* Category selection */}
        <section className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={sectionTitleClass}>Choose Category</h2>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
              Step 1 · Pick the vibe
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {["Breakfast", "Lunch", "Dinner", "Dessert"].map((c) => {
              const key = c.toLowerCase();
              const active = category === key;

              return (
                <button
                  key={key}
                  className={cn(
                    categoryPillBase,
                    active
                      ? "border-transparent bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm hover:shadow-md"
                      : "border-neutral-200 bg-white/90 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900",
                  )}
                  onClick={() =>
                    setCategory((prev) => (prev === key ? "" : key))
                  }
                  aria-pressed={active}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </section>

        <section className={cardClass}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className={sectionTitleClass}>Filters</h2>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                Step 2 · Personalize
              </span>
            </div>
            

            {/* Allergens */}
            <FilterMenu
              data={{ allergens: allAllergens, categories: allCategories }}
              onAllergenChange={setSelectedAllergens}
              onCategoryChange={setSelectedTags}
            />

            {/* Power-Ups now live directly under Allergens */}
            <div className="space-y-3 border-t border-dashed border-neutral-200 pt-4">
              <h3 className="text-sm font-semibold text-neutral-900">Power-Ups</h3>
              <p className={sectionSubtitleClass}>
                Give the slot machine a nudge: healthier options, cheaper picks, or
                faster meals.
              </p>
              <PowerUps value={powerups} onChange={setPowerups} />
            </div>
          </div>
        </section>


        {/* Dish count + slots */}
        <section className={cardClass}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="w-full space-y-3 lg:w-1/3">
              <h2 className={sectionTitleClass}>How many dishes?</h2>
              <DishCountInput value={dishCount} onChange={setDishCount} />
              <p className={sectionSubtitleClass}>
                Choose how many ideas you want to spin for. You can lock favorites and
                spin again.
              </p>
            </div>

            <div className="w-full lg:w-2/3">
              <SlotMachine
                reelCount={dishCount}
                onSpin={onSpin}
                cooldownMs={cooldownMs}
                busy={busy}
                selection={selection}
              />
            </div>
          </div>
        </section>

        {/* Selected dishes + actions */}
        {selection.length > 0 && (
          <section
            className={cn(
              cardClass,
              "animate-[fadeInUp_180ms_ease-out]",
            )}
          >
            <h2 className={sectionTitleClass}>Selected Dishes</h2>

            <ul className="mt-2 space-y-1.5 text-sm">
              {selection.map((d) => (
                <li key={d.id} className="flex items-baseline gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500" />
                  <div>
                    <span className="font-medium text-neutral-900">
                      {d.name}
                    </span>{" "}
                    <span className="text-xs uppercase tracking-wide text-neutral-500">
                      ({d.category})
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                onClick={() => setOpenVideoModal(true)}
              >
                🍳 Cook at Home
              </button>

              <button
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm transition-all hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
                onClick={() => {
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

        {/* Eat outside section */}
        <section id="outside" className={cardClass}>
          <h2 className={sectionTitleClass}>Eat Outside</h2>
          <p className={sectionSubtitleClass}>
            Shows stubbed venues; “Using city-level location.”
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
                    className="rounded-xl border border-neutral-200 bg-white/80 p-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
                  >
                    <div className="mb-1 text-sm font-semibold text-neutral-900">
                      {v.name}
                    </div>
                    <div className="text-xs text-neutral-600">
                      {v.cuisine} • {v.price} • {v.rating.toFixed(1)}★ •{" "}
                      {v.distance_km} km
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {v.addr}
                    </div>
                    <a
                      className="mt-2 inline-block text-xs font-medium text-orange-700 underline-offset-2 hover:underline"
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Visit website
                    </a>
                  </div>
                ))}
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 shadow-sm">
                <MapWithPins venues={venues} />
              </div>
            </>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-6 text-sm text-neutral-600">
              Spin the slot machine and choose{" "}
              <span className="font-medium text-neutral-800">
                “Eat Outside”
              </span>{" "}
              to see nearby places that match your dishes.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Client-only dynamic import
export default dynamic(() => Promise.resolve(HomePage), { ssr: false });
