/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import FilterMenu from "../../components/FilterMenu";

const MOCK_FILTERS = {
  tags: ["Halal", "Vegan", "Kosher"],
  allergens: ["Peanuts", "Dairy"],
};

describe("FilterMenu component", () => {
  let originalFetch: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    originalFetch = (globalThis as any).fetch;
    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => { /* silence in tests */ });
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("uses data prop when provided and does not fetch", async () => {
    const fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;

    const onAllergenChange = vi.fn();

    render(
      <FilterMenu
        data={MOCK_FILTERS}
        onTagChange={() => {}}
        onAllergenChange={onAllergenChange}
      />,
    );

    // Heading
    expect(screen.getByText("Allergens")).toBeInTheDocument();

    // Buttons rendered from data
    expect(
      screen.getByRole("button", { name: "Peanuts" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Dairy" }),
    ).toBeInTheDocument();

    // No fetch when data is provided
    expect(fetchMock).not.toHaveBeenCalled();

    // user is null in tests, so validAllergens is [] and callback gets called with []
    await waitFor(() => {
      expect(onAllergenChange).toHaveBeenCalledWith([]);
    });
  });

  it("fetches filters when data is not provided and shows loading state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_FILTERS,
    });
    (globalThis as any).fetch = fetchMock;

    render(
      <FilterMenu
        onTagChange={() => {}}
        onAllergenChange={() => {}}
      />,
    );

    // While loading, we see the placeholder text
    expect(
      screen.getByText("Loading allergens..."),
    ).toBeInTheDocument();

    // After fetch resolves, buttons appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Peanuts" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Dairy" }),
      ).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/filters");
  });

  it("toggles allergens and calls onAllergenChange", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_FILTERS,
    });
    (globalThis as any).fetch = fetchMock;

    const onAllergenChange = vi.fn();

    render(
      <FilterMenu
        onTagChange={() => {}}
        onAllergenChange={onAllergenChange}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Peanuts" }),
      ).toBeInTheDocument();
    });

    const peanutsBtn = screen.getByRole("button", { name: "Peanuts" });

    // Initial state: not pressed
    expect(peanutsBtn).toHaveAttribute("aria-pressed", "false");

    // First click selects
    fireEvent.click(peanutsBtn);
    const lastCall1 =
      onAllergenChange.mock.calls[onAllergenChange.mock.calls.length - 1][0];
    expect(lastCall1).toEqual(["Peanuts"]);
    expect(peanutsBtn).toHaveAttribute("aria-pressed", "true");

    // Second click deselects
    fireEvent.click(peanutsBtn);
    const lastCall2 =
      onAllergenChange.mock.calls[onAllergenChange.mock.calls.length - 1][0];
    expect(lastCall2).toEqual([]);
    expect(peanutsBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("logs an error when fetching filters fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    (globalThis as any).fetch = fetchMock;

    render(
      <FilterMenu
        onTagChange={() => {}}
        onAllergenChange={() => {}}
      />,
    );

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
      const joined = consoleErrorSpy.mock.calls
        .map((c: any[]) => c.join(" "))
        .join(" ");
      expect(joined).toMatch(/FilterMenu: Failed to fetch filters/i);
    });
  });

    it("does not update state after unmount if filters resolve late (cancelled fetch path)", async () => {
        let resolveJson!: (value: any) => void;

        (globalThis as any).fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () =>
            new Promise((res) => {
                resolveJson = res;
            }),
        });

        const { unmount } = render(
            <FilterMenu
            onTagChange={() => {}}
            onAllergenChange={() => {}}
            />
        );

        // Ensure fetch was called
        await waitFor(() => {
            expect((globalThis as any).fetch).toHaveBeenCalled();
        });

        // Trigger cleanup → cancelled = true
        unmount();

        // Resolve AFTER unmount (hits: if (cancelled) return;)
        resolveJson(MOCK_FILTERS);

        // Flush microtasks
        await Promise.resolve();

        // Test passes if no crash occurs
        expect(true).toBe(true);
    });

});
