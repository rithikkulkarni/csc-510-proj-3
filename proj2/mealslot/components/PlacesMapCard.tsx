"use client";

import React, { useEffect, useRef } from "react";

/**
 * Real Google Map card (zoom/scroll), loaded via script tag.
 * Uses NEXT_PUBLIC_GOOGLE_MAPS_KEY (your chosen env name).
 */
export default function PlacesMapCard({ height = 260 }: { height?: number }) {
  const divRef = useRef<HTMLDivElement>(null);

  // tiny loader that injects the Google Maps JS once
  const loadGoogleMaps = () =>
    new Promise<void>((resolve, reject) => {
      if (typeof window !== "undefined" && (window as any).google?.maps) {
        resolve();
        return;
      }
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
      if (!key) {
        console.warn("Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY");
        resolve(); // render empty box gracefully
        return;
      }
      const id = "gmaps-sdk";
      if (document.getElementById(id)) {
        (document.getElementById(id) as HTMLScriptElement).addEventListener(
          "load",
          () => resolve(),
        );
        return;
      }
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
        if (
          cancelled ||
          !divRef.current ||
          !(window as any).google?.maps
        )
          return;

        const gm = (window as any).google.maps;
        const fallback = { lat: 35.7704, lng: -78.674 }; // Raleigh fallback
        const map = new gm.Map(divRef.current, {
          center: fallback,
          zoom: 14,
          disableDefaultUI: false,
        });
        new gm.Marker({ position: fallback, map });

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
              // ignore errors, stick to fallback
            },
          );
        }
      } catch (err) {
        console.warn(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/80 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      {/* Actual map container */}
      <div ref={divRef} style={{ height }} className="w-full" />

      {/* Soft top gradient so it feels more like a card over the map */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/70 via-white/10 to-transparent" />
    </div>
  );
}
