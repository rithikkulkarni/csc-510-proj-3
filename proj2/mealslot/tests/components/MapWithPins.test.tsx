/**
 * @vitest-environment jsdom
 */
import React from "react";
import {
  render,
  cleanup,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import MapWithPins from "../../components/MapWithPins";

type LatLng = { lat: number; lng: number };

function makeGoogleMapsMocks() {
  const fitBounds = vi.fn();
  const setCenter = vi.fn();
  const setZoom = vi.fn();

  const mapInstance = {
    fitBounds,
    setCenter,
    setZoom,
  };

  const boundsPoints: LatLng[] = [];
  const bounds = {
    extend: vi.fn((pos: LatLng) => {
      boundsPoints.push(pos);
    }),
    isEmpty: vi.fn(() => boundsPoints.length === 0),
  };

  const Map = vi.fn((_el, _opts) => mapInstance);

  const Marker = vi.fn((_opts) => ({
    addListener: vi.fn(),
  }));

  const InfoWindow = vi.fn().mockImplementation(() => ({
    open: vi.fn(),
  }));

  const LatLngBounds = vi.fn(() => bounds);
  const SymbolPath = { CIRCLE: "CIRCLE" };

  (globalThis as any).window.google = {
    maps: {
      Map,
      Marker,
      InfoWindow,
      LatLngBounds,
      SymbolPath,
    },
  };

  return { mapInstance, bounds, Map, Marker, InfoWindow, LatLngBounds };
}

describe("MapWithPins", () => {
  const originalEnv = { ...process.env };
  let geoGetCurrentPositionMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).window.google = undefined;
    document.head.innerHTML = "";
    document.body.innerHTML = "";

    // Provide a configurable geolocation object
    geoGetCurrentPositionMock = vi.fn();

    Object.defineProperty(global.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: geoGetCurrentPositionMock,
      },
    });
  });

  afterEach(() => {
    cleanup();
    process.env = { ...originalEnv };
  });

  it("logs a warning and does not load script when API key is missing", async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    render(<MapWithPins venues={[]} />);

    expect(warnSpy).toHaveBeenCalledWith(
      "NEXT_PUBLIC_GOOGLE_MAPS_KEY not set",
    );
    expect(
      document.querySelector("script[src*='maps.googleapis.com']"),
    ).toBeNull();

    warnSpy.mockRestore();
  });

  it("uses geolocation success and centers map on user location with zoom 12", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = "test-key";

    geoGetCurrentPositionMock.mockImplementation((success: any) => {
      success({
        coords: { latitude: 10, longitude: 20 },
      });
    });

    const { Map } = makeGoogleMapsMocks();

    const venues = [
      { id: "v1", name: "Place 1", lat: 1, lng: 2 },
      { id: "v2", name: "Place 2", lat: 3, lng: 4 },
    ];

    render(<MapWithPins venues={venues} />);

    await waitFor(() => {
      expect(Map).toHaveBeenCalled();
    });

    const lastCall = (Map as any).mock.calls.at(-1) as any[];
    const options = lastCall[1];

    expect(options.center).toEqual({ lat: 10, lng: 20 });
    expect(options.zoom).toBe(12);
  });

  it("handles geolocation error and logs warning", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = "test-key";

    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    geoGetCurrentPositionMock.mockImplementation(
      (_success: any, error: any) => {
        error(new Error("denied"));
      },
    );

    makeGoogleMapsMocks();

    render(<MapWithPins venues={[]} />);

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
    });

    const joined = warnSpy.mock.calls
      .map((c: unknown[]) => c.map(String).join(" "))
      .join(" ");
    expect(joined).toMatch(/User denied geolocation or error:/);

    warnSpy.mockRestore();
  });

  it("injects Google Maps script when window.google is missing and runs on script load", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = "test-key";

    const venues = [{ id: "v1", name: "Place 1", lat: 5, lng: 6 }];

    render(<MapWithPins venues={venues} />);

    const script = document.querySelector(
      "#google-maps-test-key",
    ) as HTMLScriptElement;
    expect(script).not.toBeNull();
    expect(script.src).toContain("maps.googleapis.com/maps/api/js");

    const { Map } = makeGoogleMapsMocks();
    if (script.onload) {
      script.onload(new Event("load"));
    }

    await waitFor(() => {
      expect(Map).toHaveBeenCalled();
    });
  });

  it("uses polling when script already exists and clears interval on unmount", () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = "test-key";

    // Pre-insert script to trigger the polling branch
    const existingScript = document.createElement("script");
    existingScript.id = "google-maps-test-key";
    document.head.appendChild(existingScript);

    const intervalCallbacks: Array<() => void> = [];

    const setIntervalSpy = vi
      .spyOn(globalThis, "setInterval")
      .mockImplementation((
        handler: TimerHandler,
        timeout?: number,
        ...args: any[]
      ) => {
        if (typeof handler === "function") {
          intervalCallbacks.push(handler as () => void);
        }
        // Return a fake timer id; we don't care about its value
        return 123 as unknown as ReturnType<typeof setInterval>;
      });

    const clearIntervalSpy = vi
      .spyOn(globalThis, "clearInterval")
      .mockImplementation(() => {});

    const venues = [{ id: "v1", name: "Venue X", lat: 7, lng: 8 }];

    const { unmount } = render(<MapWithPins venues={venues} />);

    expect(setIntervalSpy).toHaveBeenCalled();

    // Now make google.maps available so the polling callback will run `run()`
    const { Map } = makeGoogleMapsMocks();

    // Simulate the polling interval firing once
    expect(intervalCallbacks.length).toBeGreaterThan(0);
    intervalCallbacks[0]();

    expect(Map).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();

    // Unmount should also perform cleanup; just assert clearInterval was used
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
