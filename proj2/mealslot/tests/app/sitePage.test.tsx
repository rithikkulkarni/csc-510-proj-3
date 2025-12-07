// tests/app/sitePage.test.tsx
import React from "react";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ----------------------
// Mocks (no top-level var use inside factories)
// ----------------------

// stack client (Neon / Stack auth)
vi.mock("@/stack/client", () => ({
  client: {
    getUser: vi.fn().mockResolvedValue(null), // no logged-in user by default
  },
}));

// actions used in the page
vi.mock("../../app/actions", () => ({
  getUserDetails: vi.fn(),
  getAllAllergens: vi.fn(),
  updateUserDetails: vi.fn(),
}));

// SlotMachine → harness that can spin AND toggle-save
vi.mock("@/components/SlotMachine", () => ({
  SlotMachine: ({ onSpin, onToggleSave, selection }: any) => (
    <div data-testid="slot-machine">
      <button
        data-testid="slot-spin"
        onClick={() => onSpin([])}
      >
        Spin Now
      </button>
      <button
        data-testid="slot-toggle-save"
        onClick={() => {
          if (selection && selection[0]) {
            onToggleSave?.(selection[0]);
          }
        }}
      >
        Toggle Save
      </button>
    </div>
  ),
}));

// PowerUps / FilterMenu → simple placeholders
vi.mock("@/components/PowerUps", () => ({
  PowerUps: () => <div data-testid="powerups" />,
}));

vi.mock("@/components/FilterMenu", () => ({
  default: () => <div data-testid="filter-menu" />,
}));

// VideoPanel / MapWithPins mocked to simple divs
vi.mock("@/components/VideoPanel", () => ({
  default: () => <div data-testid="video-panel" />,
}));

vi.mock("@/components/MapWithPins", () => ({
  default: () => <div data-testid="map-with-pins" />,
}));

// Modal → only renders children when open={true}
vi.mock("@/components/ui/Modal", () => ({
  default: ({ open, children }: any) =>
    open ? <div data-testid="modal">{children}</div> : null,
}));

// ----------------------
// Import the page AFTER mocks
// ----------------------
import SiteHomePage from "../../app/(site)/page";
import { client } from "../../stack/client";
import { getUserDetails, updateUserDetails } from "../../app/actions";

// ----------------------
// Helpers to stub /api/spin, /api/videos, /api/places
// ----------------------
const mockSpinVideosAndPlaces = () => {
  (global as any).fetch = vi
    .fn()
    // 1st call: /api/spin
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        selection: [
          { id: "1", name: "Pasta", category: "Dinner" },
          { id: "2", name: "Salad", category: "Lunch" },
        ],
      }),
    } as any)
    // 2nd call: /api/videos
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: {
          Pasta: [{ id: "v1", title: "Video 1" }],
          Salad: [{ id: "v2", title: "Video 2" }],
        },
      }),
    } as any)
    // 3rd call: /api/places (for Eat Outside) – venues: []
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        venues: [],
      }),
    } as any);
};

const mockSpinVideosAndPlacesWithVenueResultsObject = () => {
  (global as any).fetch = vi
    .fn()
    // /api/spin
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        selection: [
          { id: "1", name: "Pasta", category: "Dinner" },
          { id: "2", name: "Salad", category: "Lunch" },
        ],
      }),
    } as any)
    // /api/videos
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: {
          Pasta: [{ id: "v1", title: "Video 1" }],
          Salad: [{ id: "v2", title: "Video 2" }],
        },
      }),
    } as any)
    // /api/places – "results" object branch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: {
          group1: [
            {
              id: "venue-1",
              name: "Results Venue",
              addr: "123 Result St",
              rating: 4.2,
              price: "$$",
              url: "https://example.com/results",
              cuisine: "Mexican",
              distance_km: 2.3,
            },
          ],
        },
      }),
    } as any);
};

const mockSpinVideosAndPlacesWithVenueArray = () => {
  (global as any).fetch = vi
    .fn()
    // /api/spin
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        selection: [
          { id: "1", name: "Pasta", category: "Dinner" },
          { id: "2", name: "Salad", category: "Lunch" },
        ],
      }),
    } as any)
    // /api/videos
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: {
          Pasta: [{ id: "v1", title: "Video 1" }],
          Salad: [{ id: "v2", title: "Video 2" }],
        },
      }),
    } as any)
    // /api/places – plain array branch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "venue-array",
          name: "Array Venue",
          addr: "789 Array Ave",
          rating: 4.8,
          price: "$",
          url: "https://example.com/array",
          cuisine: "Italian",
          distance_km: 0.9,
        },
      ],
    } as any);
};

const mockSpinVideosAndPlacesWithVenueSimple = () => {
  (global as any).fetch = vi
    .fn()
    // /api/spin
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        selection: [
          { id: "1", name: "Pasta", category: "Dinner" },
          { id: "2", name: "Salad", category: "Lunch" },
        ],
      }),
    } as any)
    // /api/videos
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: {
          Pasta: [{ id: "v1", title: "Video 1" }],
          Salad: [{ id: "v2", title: "Video 2" }],
        },
      }),
    } as any)
    // /api/places – venues array (original path)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        venues: [
          {
            id: "venue-plain",
            name: "Test Venue",
            addr: "123 Main St",
            rating: 4.5,
            price: "$$",
            url: "https://example.com",
            cuisine: "Italian",
            distance_km: 1.2,
          },
        ],
      }),
    } as any);
};

const mockSpinError = () => {
  (global as any).fetch = vi.fn().mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: async () => ({ message: "Server error" }),
  } as any);
};

const mockSpinNoSelection = () => {
  (global as any).fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ selection: [] }),
  } as any);
};

// ----------------------
// Tests
// ----------------------
describe("SiteHomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // reset fetch to undefined so tests explicitly set it when needed
    (global as any).fetch = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders main page sections", async () => {
    render(<SiteHomePage />);

    expect(
      await screen.findByText("What should we eat today?"),
    ).toBeInTheDocument();

    expect(
      await screen.findByText("Categories"),
    ).toBeInTheDocument();

    expect(
      await screen.findByText("Filters"),
    ).toBeInTheDocument();

    expect(
      await screen.findByText("Spin the Slots"),
    ).toBeInTheDocument();
  });

  it("loads user from localStorage userProfile without calling Neon auth", async () => {
    const profile = {
      name: "Stored User",
      id: "stored-1",
      allergens: ["nuts"],
      savedMeals: ["dish-1"],
    };
    localStorage.setItem("userProfile", JSON.stringify(profile));

    render(<SiteHomePage />);

    // Give the effect a moment to run
    await waitFor(() =>
      expect((client as any).getUser).not.toHaveBeenCalled(),
    );
  });

  it("loads Neon user profile when no cached userProfile", async () => {
    const neonMock = (client as any).getUser as ReturnType<typeof vi.fn>;
    neonMock.mockResolvedValueOnce({ id: "neon-123" });

    (getUserDetails as any).mockResolvedValueOnce({
      name: "Neon User",
      id: "neon-123",
      allergens: ["dairy"],
      savedMeals: ["dish-x"],
    });

    render(<SiteHomePage />);

    await waitFor(() =>
      expect(getUserDetails).toHaveBeenCalledWith("neon-123"),
    );

    expect(localStorage.getItem("userProfile")).not.toBeNull();
  });

  it("falls back to guest user when guestUser flag is set", async () => {
    localStorage.setItem("guestUser", "true");

    const neonMock = (client as any).getUser as ReturnType<typeof vi.fn>;
    neonMock.mockResolvedValueOnce(null);

    (getUserDetails as any).mockResolvedValueOnce(null);

    render(<SiteHomePage />);

    await waitFor(() =>
      expect(getUserDetails).not.toHaveBeenCalled(),
    );
  });

  it("shows Eat Outside hint when no venues yet", async () => {
    mockSpinVideosAndPlaces();
    render(<SiteHomePage />);

    fireEvent.click(screen.getByTestId("slot-spin"));

    // wait for selection to render
    await screen.findByText("Selected Dishes");

    // Now look for the hint – there may be multiple matches, so use *AllBy*
    const hints = await screen.findAllByText((_, node) =>
      node?.textContent?.includes('Click "📍 Eat Outside" above'),
    );

    expect(hints.length).toBeGreaterThan(0);
  });

  it("opens Cook at Home modal on button click", async () => {
    mockSpinVideosAndPlaces();
    render(<SiteHomePage />);

    fireEvent.click(screen.getByTestId("slot-spin"));

    const cookButton = await screen.findByText("🍳 Cook at Home");
    fireEvent.click(cookButton);

    expect(await screen.findByTestId("modal")).toBeInTheDocument();
    expect(screen.getByTestId("video-panel")).toBeInTheDocument();
  });

  it("uses fallback Denver location when geolocation fails", async () => {
    mockSpinVideosAndPlaces();

    // Make geolocation exist, but always trigger the error callback.
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_success: any, error: any) => {
          // trigger error path -> fetchVenues() without coords -> locationHint="Denver"
          error(new Error("geolocation denied"));
        },
      },
    });

    render(<SiteHomePage />);

    fireEvent.click(screen.getByTestId("slot-spin"));

    const eatOutsideButton = await screen.findByText("📍 Eat Outside");
    fireEvent.click(eatOutsideButton);

    // 3rd fetch call should be /api/places with "Denver" in body
    await waitFor(() =>
      expect(global.fetch as any).toHaveBeenNthCalledWith(
        3,
        "/api/places",
        expect.objectContaining({
          body: expect.stringContaining("Denver"),
        }),
      ),
    );
  });

  it("uses geolocation coordinates when available", async () => {
    mockSpinVideosAndPlaces();

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: any) => {
          success({
            coords: { latitude: 10, longitude: 20 },
          } as GeolocationPosition);
        },
      },
    });

    render(<SiteHomePage />);

    fireEvent.click(screen.getByTestId("slot-spin"));

    const eatOutsideButton = await screen.findByText("📍 Eat Outside");
    fireEvent.click(eatOutsideButton);

    await waitFor(() =>
      expect(global.fetch as any).toHaveBeenNthCalledWith(
        3,
        "/api/places",
        expect.objectContaining({
          body: expect.stringContaining('"lat":10'),
        }),
      ),
    );
  });

  it("renders venues and map when places are returned (venues array path)", async () => {
    mockSpinVideosAndPlacesWithVenueSimple();

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: any) => {
          success({
            coords: { latitude: 35, longitude: -105 },
          } as GeolocationPosition);
        },
      },
    });

    render(<SiteHomePage />);

    fireEvent.click(screen.getByTestId("slot-spin"));

    const eatOutsideButton = await screen.findByText("📍 Eat Outside");
    fireEvent.click(eatOutsideButton);

    // Map should render (our mock gives this test id)
    expect(await screen.findByTestId("map-with-pins")).toBeInTheDocument();

    // Venue name from mocked /api/places response should render
    expect(await screen.findByText("Test Venue")).toBeInTheDocument();
  });

  it("normalizes venues from 'results' object", async () => {
    mockSpinVideosAndPlacesWithVenueResultsObject();

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: any) => {
          success({
            coords: { latitude: 40, longitude: -74 },
          } as GeolocationPosition);
        },
      },
    });

    render(<SiteHomePage />);

    fireEvent.click(screen.getByTestId("slot-spin"));

    const eatOutsideButton = await screen.findByText("📍 Eat Outside");
    fireEvent.click(eatOutsideButton);

    expect(await screen.findByText("Results Venue")).toBeInTheDocument();
  });

  it("normalizes venues from plain array response", async () => {
    mockSpinVideosAndPlacesWithVenueArray();

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: any) => {
          success({
            coords: { latitude: 51, longitude: 0 },
          } as GeolocationPosition);
        },
      },
    });

    render(<SiteHomePage />);

    fireEvent.click(screen.getByTestId("slot-spin"));

    const eatOutsideButton = await screen.findByText("📍 Eat Outside");
    fireEvent.click(eatOutsideButton);

    expect(await screen.findByText("Array Venue")).toBeInTheDocument();
  });

  it("handles spin error and shows alert", async () => {
    mockSpinError();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<SiteHomePage />);

    fireEvent.click(screen.getByTestId("slot-spin"));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Spin failed: Server error"),
    );

    alertSpy.mockRestore();
  });

  it("dedupes selection when spin returns duplicate dishes", async () => {
    (global as any).fetch = vi
      .fn()
      // /api/spin with duplicates
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          selection: [
            { id: "dup-1", name: "Pasta", category: "Dinner" },
            { id: "dup-1", name: "Pasta", category: "Dinner" }, // duplicate
          ],
        }),
      } as any)
      // /api/videos
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: { Pasta: [] },
        }),
      } as any);

    render(<SiteHomePage />);

    fireEvent.click(screen.getByTestId("slot-spin"));

    await screen.findByText("Selected Dishes");

    const pastas = screen.getAllByText("Pasta");
    expect(pastas).toHaveLength(1);
  });

  it("early-returns in fetchVideos when there are no dishes", async () => {
    mockSpinNoSelection();

    render(<SiteHomePage />);

    fireEvent.click(screen.getByTestId("slot-spin"));

    // Only the /api/spin call should be made; /api/videos never called
    await waitFor(() => {
      expect((global as any).fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("toggles saved meals via SlotMachine and persists optimistically", async () => {
    // 1: spin to get a selection
    (global as any).fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          selection: [
            { id: "dish-save", name: "Savable Dish", category: "Dinner" },
          ],
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: { "Savable Dish": [] } }),
      } as any);

    // Set a user profile so authId path is taken in toggleSavedMeal
    const profile = {
      name: "Auth User",
      id: "auth-1",
      auth_id: "auth-1",
      savedMeals: [],
    };
    localStorage.setItem("userProfile", JSON.stringify(profile));

    // updateUserDetails resolves with new savedMeals
    (updateUserDetails as any).mockResolvedValueOnce({
      savedMeals: ["dish-save"],
    });

    render(<SiteHomePage />);

    // spin to get "Savable Dish"
    fireEvent.click(screen.getByTestId("slot-spin"));
    await screen.findByText("Selected Dishes");
    await screen.findByText("Savable Dish");

    // now toggle save via mocked SlotMachine button
    fireEvent.click(screen.getByTestId("slot-toggle-save"));

    // ensure updateUserDetails was called with updated savedMeals
    await waitFor(() => {
      expect(updateUserDetails).toHaveBeenCalledWith("auth-1", {
        savedMeals: ["dish-save"],
      });
    });

    // cached profile should be updated in localStorage
    const cached = JSON.parse(localStorage.getItem("userProfile") || "{}");
    expect(cached.savedMeals).toEqual(["dish-save"]);
  });
});
