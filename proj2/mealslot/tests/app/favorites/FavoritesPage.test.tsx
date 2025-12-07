// tests/app/account/SavedMealsPage.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ----------------------
// Module mocks (hoist-safe)
// ----------------------

// Mock next/link to a simple anchor
vi.mock("next/link", () => ({
  __esModule: true,
  default: (props: any) => <a {...props} />,
}));

// Mock cn + style utilities so we don't depend on their actual implementation
vi.mock("@/components/ui/cn", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/components/ui/style", () => ({
  cardClass: "card",
  categoryPillBase: "pill",
  contentClass: "content",
  sectionTitleClass: "section-title",
  shellClass: "shell",
}));

// Mock useUser from UserContext
vi.mock("@/app/context/UserContext", () => {
  const state = {
    user: null as any,
    setUser: vi.fn(),
    refreshUser: vi.fn(),
  };
  return {
    useUser: () => state,
    __mocks: state,
  };
});

// ----------------------
// Imports AFTER mocks
// ----------------------
import * as UserContextModule from "../../../app/context/UserContext";
import SavedMealsPage from "../../../app/favorites/page";

const userContextMocks = (UserContextModule as any).__mocks;

describe("SavedMealsPage", () => {
  let originalFetch: any;
  let fetchMock: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default user for tests (overridden per-test where needed)
    userContextMocks.user = {
      id: "u1",
      auth_id: "auth-u1",
      name: "Test User",
      savedMeals: [],
      allergens: [],
    };
    userContextMocks.setUser = vi.fn();
    userContextMocks.refreshUser = vi.fn();

    originalFetch = (globalThis as any).fetch;
    fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;

    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => { /* silence */ });
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    consoleErrorSpy.mockRestore();
  });

  /* -------------------- not signed in -------------------- */

  it("shows sign-in prompt when user is null", async () => {
    userContextMocks.user = null;

    // dishes fetch is irrelevant here; just prevent crashes
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([]),
    });

    render(<SavedMealsPage />);

    expect(
      screen.getByText("You must be signed in to see favorites."),
    ).toBeInTheDocument();

    const link = screen.getByText("Sign In") as HTMLAnchorElement;
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/auth/callback?action=login");
  });

  /* -------------------- signed in, saved meals + filtering -------------------- */

  it("renders saved meals from fetched dishes and filters by category", async () => {
    userContextMocks.user = {
      id: "u1",
      auth_id: "auth-u1",
      name: "Test User",
      savedMeals: ["d1", "d2"],
      allergens: [],
    };

    const dishes = [
      { id: "d1", name: "Pancakes", category: "Breakfast" },
      { id: "d2", name: "Burger", category: "Dinner" },
      { id: "d3", name: "Not Saved", category: "Lunch" },
    ];

    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(dishes),
    });

    render(<SavedMealsPage />);

    // Wait for dishes to be loaded and mapped to saved meals
    await waitFor(() => {
      expect(screen.getByText("Pancakes")).toBeInTheDocument();
      expect(screen.getByText("Burger")).toBeInTheDocument();
    });

    // Category buttons: All + Breakfast + Dinner (Lunch not shown since no saved meals in Lunch)
    const allBtn = screen.getByRole("button", { name: "All" });
    const breakfastBtn = screen.getByRole("button", { name: "Breakfast" });
    const dinnerBtn = screen.getByRole("button", { name: "Dinner" });

    expect(allBtn).toBeInTheDocument();
    expect(breakfastBtn).toBeInTheDocument();
    expect(dinnerBtn).toBeInTheDocument();

    // Filter to "Breakfast"
    fireEvent.click(breakfastBtn);

    await waitFor(() => {
      expect(screen.getByText("Pancakes")).toBeInTheDocument();
    });

    // "Burger" (Dinner) should no longer be visible in filtered list
    expect(screen.queryByText("Burger")).not.toBeInTheDocument();

    // Back to All
    fireEvent.click(allBtn);

    await waitFor(() => {
      expect(screen.getByText("Burger")).toBeInTheDocument();
    });
  });

  /* -------------------- remove meal happy path -------------------- */

  it("removes a saved meal, calls API, and refreshes user", async () => {
    userContextMocks.user = {
      id: "u1",
      auth_id: "auth-u1",
      name: "Test User",
      savedMeals: ["d1"],
      allergens: [],
    };

    const dishes = [{ id: "d1", name: "Pasta", category: "Dinner" }];

    // First call: /api/dishes
    fetchMock.mockImplementation((url: any) => {
      if (typeof url === "string" && url.includes("/api/dishes")) {
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue(dishes),
        });
      }
      if (typeof url === "string" && url.includes("/api/user/saved")) {
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({}),
        });
      }
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      });
    });

    render(<SavedMealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Pasta")).toBeInTheDocument();
    });

    const removeButton = screen.getByRole("button", {
      name: "Remove saved meal",
    });

    fireEvent.click(removeButton);

    await waitFor(() => {
      // Optimistic setUser called with updated savedMeals []
      expect(userContextMocks.setUser).toHaveBeenCalled();
      const [[updatedUser]] = userContextMocks.setUser.mock.calls;
      expect(updatedUser.savedMeals).toEqual([]);

      // API called to persist change
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/user/saved",
        expect.objectContaining({
          method: "POST",
        }),
      );

      // refreshUser called after persistence
      expect(userContextMocks.refreshUser).toHaveBeenCalled();
    });
  });

  /* -------------------- remove meal error path -------------------- */

  it("logs an error when remove meal API call fails", async () => {
    userContextMocks.user = {
      id: "u1",
      auth_id: "auth-u1",
      name: "Test User",
      savedMeals: ["d1"],
      allergens: [],
    };

    const dishes = [{ id: "d1", name: "Salad", category: "Lunch" }];

    fetchMock.mockImplementation((url: any) => {
      if (typeof url === "string" && url.includes("/api/dishes")) {
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue(dishes),
        });
      }
      if (typeof url === "string" && url.includes("/api/user/saved")) {
        return Promise.reject(new Error("network down"));
      }
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      });
    });

    render(<SavedMealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Salad")).toBeInTheDocument();
    });

    const removeButton = screen.getByRole("button", {
      name: "Remove saved meal",
    });

    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
      const firstCall = consoleErrorSpy.mock.calls[0][0];
      expect(firstCall).toBe("Failed to remove meal:");
    });
  });

  /* -------------------- fetchDishes error path -------------------- */

  it("handles errors when fetching dishes fails", async () => {
    userContextMocks.user = {
      id: "u1",
      auth_id: "auth-u1",
      name: "Test User",
      savedMeals: ["d1"],
      allergens: [],
    };

    // fetch for /api/dishes throws
    fetchMock.mockImplementation((url: any) => {
      if (typeof url === "string" && url.includes("/api/dishes")) {
        return Promise.reject(new Error("dishes down"));
      }
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      });
    });

    render(<SavedMealsPage />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    // Since dishes failed to load, no saved meal cards are shown
    expect(
      screen.getByText("You have no saved meals yet."),
    ).toBeInTheDocument();
  });
});
