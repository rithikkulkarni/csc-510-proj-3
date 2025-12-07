// tests/components/PlacesMapCard.test.tsx
import React from "react";
import { render, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, afterEach } from "vitest";
import PlacesMapCard from "../../components/PlacesMapCard";

declare global {
  interface Window {
    google?: any;
  }
}

afterEach(() => {
  cleanup();
  delete (window as any).google;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  vi.restoreAllMocks();
});

describe("PlacesMapCard", () => {
  it("renders the card and initializes Google Maps + geolocation when google.maps is already loaded", async () => {
    // Stub google maps API already present on window
    const mockMapInstance = {
      setCenter: vi.fn(),
    };
    const mockMapConstructor = vi.fn(() => mockMapInstance);
    const mockMarkerConstructor = vi.fn();

    (window as any).google = {
      maps: {
        Map: mockMapConstructor,
        Marker: mockMarkerConstructor,
      },
    };

    // Stub geolocation success using defineProperty (since it's read-only)
    Object.defineProperty(window.navigator, "geolocation", {
      value: {
        getCurrentPosition: vi.fn((success: any) => {
          success({
            coords: { latitude: 10, longitude: 20 },
          });
        }),
      },
      configurable: true,
    });

    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = "TEST_KEY";

    const { container } = render(<PlacesMapCard />);

    // Outer card
    const card = container.firstElementChild as HTMLDivElement;
    expect(card).toBeInTheDocument();

    // Map div (first child of card)
    const mapDiv = card.firstElementChild as HTMLDivElement;
    expect(mapDiv).toBeInTheDocument();
    // default height = 260
    expect(mapDiv.style.height).toBe("260px");

    // Map should be created with fallback center
    await waitFor(() => {
      expect(mockMapConstructor).toHaveBeenCalledTimes(1);
    });

    const mapCallArgs = (mockMapConstructor as any).mock.calls[0];
    expect(mapCallArgs[0]).toBe(mapDiv);
    expect(mapCallArgs[1]).toMatchObject({
      center: { lat: 35.7704, lng: -78.674 },
      zoom: 14,
    });

    // First marker at fallback, second marker at geolocated position
    expect(mockMarkerConstructor).toHaveBeenCalledTimes(2);
    const firstMarkerArgs = (mockMarkerConstructor as any).mock.calls[0][0];
    const secondMarkerArgs = (mockMarkerConstructor as any).mock.calls[1][0];

    expect(firstMarkerArgs).toMatchObject({
      position: { lat: 35.7704, lng: -78.674 },
      map: mockMapInstance,
    });
    expect(secondMarkerArgs).toMatchObject({
      position: { lat: 10, lng: 20 },
      map: mockMapInstance,
    });

    // Geolocation should have been called
    expect(
      (window.navigator as any).geolocation.getCurrentPosition
    ).toHaveBeenCalled();
  });

  it("renders gracefully and warns when NEXT_PUBLIC_GOOGLE_MAPS_KEY is missing", async () => {
    // No google, no env key
    delete (window as any).google;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { container } = render(<PlacesMapCard height={300} />);

    const card = container.firstElementChild as HTMLDivElement;
    expect(card).toBeInTheDocument();

    const mapDiv = card.firstElementChild as HTMLDivElement;
    expect(mapDiv).toBeInTheDocument();
    expect(mapDiv.style.height).toBe("300px");

    // loadGoogleMaps should log the missing-key warning and resolve,
    // and then effect should bail because google.maps is still undefined
    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        "Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY"
      );
    });
  });

  it("injects the Google Maps script and logs a warning if the script fails to load", async () => {
    delete (window as any).google;
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = "MY_TEST_KEY";

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<PlacesMapCard />);

    // Script should be appended to <head>
    const script = await waitFor(() => {
      const s = document.getElementById("gmaps-sdk") as HTMLScriptElement | null;
      expect(s).toBeTruthy();
      return s!;
    });

    expect(script.async).toBe(true);
    expect(script.defer).toBe(true);
    expect(script.src).toContain(
      "https://maps.googleapis.com/maps/api/js?key="
    );
    // Key is URL-encoded
    expect(script.src).toContain(encodeURIComponent("MY_TEST_KEY"));

    // Trigger error path for loadGoogleMaps
    // @ts-expect-error jsdom types
    script.onerror(new Event("error"));

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  it("reuses an existing Google Maps script element when present", async () => {
    delete (window as any).google;
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = "ANOTHER_KEY";

    // Fake script object returned by getElementById
    const fakeScript = {
      addEventListener: vi.fn(),
    } as any;

    const getElementSpy = vi
      .spyOn(document, "getElementById")
      .mockImplementation((id: string) => {
        if (id === "gmaps-sdk") return fakeScript;
        return null;
      });

    render(<PlacesMapCard />);

    // loadGoogleMaps should attach a 'load' listener to the existing script
    await waitFor(() => {
      expect(fakeScript.addEventListener).toHaveBeenCalledWith(
        "load",
        expect.any(Function)
      );
    });

    // Sanity check that we actually hit the getElementById branch
    expect(getElementSpy).toHaveBeenCalledWith("gmaps-sdk");
  });
});
