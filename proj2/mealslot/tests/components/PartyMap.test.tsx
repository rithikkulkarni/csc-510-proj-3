// tests/components/PartyMap.test.tsx
import React from "react";
import { render, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, afterEach } from "vitest";
import PartyMap from "../../components/PartyMap";

declare global {
  interface Window {
    _partyMapInit?: () => void;   // 👈 match PartyMap.tsx exactly
    google?: any;
  }
}

afterEach(() => {
  cleanup();
  delete (window as any).google;
  delete (window as any)._partyMapInit;
});

describe("PartyMap", () => {
  it("renders a map container, exposes the init callback, and injects the Google Maps script with the API key", async () => {
    // Fake public API key for this test
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "TEST_KEY";

    const { container, unmount } = render(<PartyMap height={400} />);

    // Outer wrapper
    const wrapper = container.firstElementChild as HTMLDivElement;
    expect(wrapper).toBeInTheDocument();

    // Map div is the first child
    const mapDiv = wrapper.firstElementChild as HTMLDivElement;
    expect(mapDiv).toBeInTheDocument();

    // Inline styles
    expect(mapDiv.style.width).toBe("100%");
    expect(mapDiv.style.height).toBe("400px");

    // _partyMapInit should be exposed on window by the effect
    await waitFor(() => {
      expect(typeof window._partyMapInit).toBe("function");
    });

    // Script tag should be somewhere in the document with our key and callback
    const scripts = Array.from(
      document.querySelectorAll("script")
    ) as HTMLScriptElement[];

    const mapsScript = scripts.find((s) =>
      s.src.includes("https://maps.googleapis.com/maps/api/js")
    );

    expect(mapsScript).toBeTruthy();
    expect(mapsScript!.src).toContain("key=TEST_KEY");
    expect(mapsScript!.src).toContain("callback=_partyMapInit");

    // Cleanup should clear the global init callback
    unmount();
    expect(window._partyMapInit).toBeUndefined();
  });

  it("initializes a Google Map with the fallback center when browser location is disabled", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "TEST_KEY";

    const mockMapInstance = {};
    const mockMarkerInstance = {};

    (window as any).google = {
      maps: {
        Map: vi.fn(() => mockMapInstance),
        Marker: vi.fn(() => mockMarkerInstance),
        Animation: { DROP: "DROP" },
      },
    };

    render(<PartyMap useBrowserLocation={false} height={360} />);

    // Wait for the effect to register the init callback
    await waitFor(() => {
      expect(typeof window._partyMapInit).toBe("function");
    });

    // Call the exposed init function (async fn is fine even if typed as () => void)
    await window._partyMapInit!();

    // Map should have been created with the fallback center
    expect(window.google!.maps.Map).toHaveBeenCalledTimes(1);
    const mapCallArgs = (window.google!.maps.Map as any).mock.calls[0];

    // First arg: map container div
    expect(mapCallArgs[0]).toBeInstanceOf(HTMLDivElement);
    // Second arg: options with center and zoom
    expect(mapCallArgs[1]).toMatchObject({
      center: { lat: 35.7718, lng: -78.6811 },
      zoom: 16,
    });

    // Marker should be created at the same center and attached to the map
    expect(window.google!.maps.Marker).toHaveBeenCalledTimes(1);
    const markerArgs = (window.google!.maps.Marker as any).mock.calls[0][0];

    expect(markerArgs).toMatchObject({
      position: { lat: 35.7718, lng: -78.6811 },
      map: mockMapInstance,
      title: "You",
    });
  });

  it("returns early from initMap if Google Maps is not available", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "TEST_KEY";

    render(<PartyMap useBrowserLocation={false} />);

    await waitFor(() => {
      expect(typeof window._partyMapInit).toBe("function");
    });

    // Make sure google is not present so the guard triggers
    delete (window as any).google;

    // Calling init should resolve without throwing and effectively do nothing
    await expect(window._partyMapInit!()).resolves.toBeUndefined();
  });
});
