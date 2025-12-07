"use client";

import React, { useEffect, useRef } from "react";

/**
 * Renders an interactive Google Map inside a styled card.
 *
 * - Loads the Google Maps JS SDK on the client at runtime
 * - Starts centered on a Raleigh fallback
 * - Recenters to the user's geolocation when available
 */
export default function PlacesMapCard({ height = 260 }: { height?: number }) {
  // Host element for the Google Map instance
  const divRef = useRef<HTMLDivElement>(null);

  /**
   * Injects the Google Maps script once and waits for it to be ready.
   * Gracefully no-ops if the API key is missing.
   */
  const loadGoogleMaps = () =>
    new Promise<void>((resolve, reject) => {
      // Already loaded
      if (typeof window !== "undefined" && (window as any).google?.maps) {
        resolve();
        return;
      }

      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
      if (!key) {
        console.warn("Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY");
        // Render an empty map container instead of failing hard
        resolve();
        return;
      }

      const id = "gmaps-sdk";

      // Script tag already exists: wait for it to finish loading
      if (document.getElementById(id)) {
        (document.getElementById(id) as HTMLScriptElement).addEventListener(
          "load",
          () => resolve(),
        );
        return;
      }

      // Inject Google Maps SDK script
      const s = document.createElement("script");
      s.id = id;
      s.async = true;
      s.defer = true;
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        key,
      )}&v=weekly`;

      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Google Maps script failed to load"));

      document.head.appendChild(s);
    });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadGoogleMaps();

        // Bail out if unmounted or Maps SDK not available
        if (
          cancelled ||
          !divRef.current ||
          !(window as any).google?.maps
        ) {
          return;
        }

        const gm = (window as any).google.maps;
        const fallback = { lat: 35.7704, lng: -78.674 }; // Raleigh fallback

        const map = new gm.Map(divRef.current, {
          center: fallback,
          zoom: 14,
          disableDefaultUI: false,
        });

        // Mark fallback location
        new gm.Marker({ position: fallback, map });

        // Try to recenter on the user's current location
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (cancelled) return;

              const here = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              };

              map.setCenter(here);
              new gm.Marker({ position: here, map });
            },
            () => {
              // On error, keep using fallback center with no extra handling
            },
          );
        }
      } catch (err) {
        console.warn(err);
      }
    })();

    // Prevent updates if the effect finishes after unmount
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/80 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      {/* Map container (Google Map renders into this div) */}
      <div ref={divRef} style={{ height }} className="w-full" />

      {/* Soft overlay so the top edge feels more like a card than raw map tiles */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/70 via-white/10 to-transparent" />
    </div>
  );
}
