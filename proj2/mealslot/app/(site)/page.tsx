"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SlotMachine } from "@/components/SlotMachine";
import { PowerUps } from "@/components/PowerUps";
import FilterMenu from "@/components/FilterMenu";
import DishCountInput from "@/components/DishCountInput";
import { Dish, PowerUpsInput, RecipeJSON } from "@/lib/schemas";
import { cn } from "@/components/ui/cn";
import Modal from "@/components/ui/Modal";
import MapWithPins from "@/components/MapWithPins";
import VideoPanel, { Video } from "@/components/VideoPanel";
import GuestModal from "@/components/GuestModal";

// -------------------------
// Shared visual tokens
// -------------------------
const shellClass =
  "min-h-screen bg-gradient-to-b from-neutral-50 via-slate-50 to-neutral-100 px-4 py-6 md:px-8 lg:px-16";

const contentClass =
  "mx-auto flex w-full max-w-5xl flex-col gap-5 pb-10";

const cardClass =
  "rounded-2xl border border-neutral-200/80 bg-white/80 backdrop-blur-sm p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]";

const sectionTitleClass =
  "mb-2 text-base md:text-lg font-semibold text-neutral-900";
const sectionSubtitleClass = "text-sm text-neutral-600";

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
};

// -------------------------
// User Menu
// -------------------------
function UserMenu({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white/90 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-xs font-semibold text-white shadow-sm">
          {user?.name?.[0] ?? "G"}
        </span>
        <span>Hi, {user?.name}</span>
        <span className="text-xs text-neutral-500">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-xl border border-neutral-200 bg-white/95 shadow-lg ring-1 ring-black/5 z-50 animate-[fadeIn_120ms_ease-out]">
          <ul className="flex flex-col text-sm">
            <li>
              <button
                className="w-full px-4 py-2 text-left text-neutral-800 hover:bg-neutral-50 transition-colors"
                onClick={() => router.push("/handler/account")}
              >
                My Account
              </button>
            </li>
            <li>
              <button
                className="w-full px-4 py-2 text-left text-neutral-800 hover:bg-neutral-50 transition-colors"
                onClick={() => router.push("/handler/saved-meals")}
              >
                Saved Meals
              </button>
            </li>
            <li>
              <button
                className="w-full px-4 py-2 text-left text-neutral-800 hover:bg-neutral-50 transition-colors"
                onClick={() => router.push("/handler/preferences")}
              >
                Dietary Preferences
              </button>
            </li>
            <li>
              <button
                className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
                onClick={onSignOut}
              >
                Sign Out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

// -------------------------
// Home Page
// -------------------------
function HomePage() {
  const [user, setUser] = useState<User | null>(null);

  const [category, setCategory] = useState<string>("Breakfast");
  const [dishCount, setDishCount] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [powerups, setPowerups] = useState<PowerUpsInput>({});
  const [selection, setSelection] = useState<Dish[]>([]);
  const [busy, setBusy] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);

  const [recipes, setRecipes] = useState<RecipeJSON[] | null>(null);
  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [openVideoModal, setOpenVideoModal] = useState(false);
  const [videosByDish, setVideosByDish] = useState<Record<string, Video[]>>({});

  // -------------------------
  // Cuisines
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
      t = window.setInterval(
        () => setCooldownMs((ms) => Math.max(0, ms - 250)),
        250,
      );
    }
    return () => (t ? clearInterval(t) : undefined);
  }, [cooldownMs]);

  // -------------------------
  // Spin slot machine
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

  // -------------------------
  // Fetch Videos
  // -------------------------
  const fetchVideos = async (dishes: Dish[]) => {
    if (!dishes.length) return;
    const dishNames = dishes.map((d) => d.name);

    const res = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dishes: dishNames }),
    });

    const data = await res.json();
    if (res.ok) {
      setVideosByDish(data.results);
    } else {
      console.error("Failed to fetch videos", data);
    }
  };

  // -------------------------
  // Fetch Venues
  // -------------------------
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
  // Sign out handler
  // -------------------------
  const handleSignOut = () => {
    localStorage.removeItem("guestUser");
    setUser(null);
  };

  // Shared pill style for category buttons
  const categoryPillBase =
    "rounded-full border px-4 py-1.5 text-sm font-medium transform transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 hover:-translate-y-0.5 hover:scale-[1.05] active:scale-[0.97]";

  return (
    <div className={shellClass}>
      <div className={contentClass}>
        {/* Top meta / welcome row */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">
              What should we eat today?
            </h1>
            <p className="max-w-xl text-sm md:text-base text-neutral-600">
              Spin the slots, tweak your filters, and let MealSlot pick your next
              meal—cook at home or find a spot nearby.
            </p>
          </div>

          {/* ✅ Guest modal */}
          <div className="flex items-center gap-3">
            <GuestModal onGuest={() => setUser({ name: "Guest" })} />
            {user && <UserMenu user={user} onSignOut={handleSignOut} />}
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
              const active = category === c.toLowerCase();
              return (
                <button
                  key={c.toLowerCase()}
                  className={cn(
                    categoryPillBase,
                    active
                      ? "border-transparent bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm hover:shadow-md"
                      : "border-neutral-200 bg-white/90 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900",
                  )}
                  onClick={() =>
                    setCategory((prev) =>
                      prev === c.toLowerCase() ? "" : c.toLowerCase(),
                    )
                  }
                  aria-pressed={active}
                >
                  {c}
                </button>
              );
            })}
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
              <h3 className="text-sm font-semibold text-neutral-900">
                Power-Ups
              </h3>
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
            <div className="w-full lg:w-1/3 space-y-3">
              <h2 className={sectionTitleClass}>How many dishes?</h2>
              <DishCountInput value={dishCount} onChange={setDishCount} />
              <p className={sectionSubtitleClass}>
                Choose how many ideas you want to spin for. You can lock favorites
                and spin again.
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
                    <div className="mt-1 text-xs text-neutral-500">{v.addr}</div>
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

// Client-only page to avoid hydration issues
export default dynamic(() => Promise.resolve(HomePage), { ssr: false });
