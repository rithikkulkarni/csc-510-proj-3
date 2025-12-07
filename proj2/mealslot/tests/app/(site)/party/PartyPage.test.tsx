// tests/app/partyPage.test.tsx
import React from "react";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ----------------------
// Mocks
// ----------------------

// We need a controllable mock for useSearchParams
const useSearchParamsMock = vi.fn();

// next/navigation → useSearchParams
vi.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

// User context
vi.mock("@/app/context/UserContext", () => ({
  useUser: () => ({
    user: { auth_id: "auth-123" },
  }),
}));

// PartyClient: expose a button that calls onSpin() so we can set spinOccurred
vi.mock("@/components/PartyClient", () => ({
  __esModule: true,
  default: ({ onSpin }: any) => (
    <div data-testid="party-client">
      <button
        data-testid="party-spin"
        onClick={() => onSpin()}
      >
        Party Spin
      </button>
    </div>
  ),
}));

// Import the page AFTER mocks
import PartyPage from "../../../../app/(site)/party/page";

// ----------------------
// Helpers
// ----------------------

// Convenience: set search params for tests
const setSearchParams = (query: string) => {
  useSearchParamsMock.mockReturnValue(new URLSearchParams(query));
};

describe("PartyPage", () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default search params: no code
    setSearchParams("");

    // Stub fetch; individual tests will override with mockResolvedValueOnce()
    (global as any).fetch = vi.fn();

    // Clipboard mock
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn(),
      },
    });

    // Save and override window.location so we can spy on reload
    originalLocation = window.location;
    delete (window as any).location;
    // @ts-expect-error
    window.location = { ...originalLocation, reload: vi.fn() };
  });

  afterEach(() => {
    // Restore window.location
    // @ts-expect-error
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  it("renders header and basic inputs", () => {
    render(<PartyPage />);

    expect(
      screen.getByText("Party Mode"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Your Party Code"),
    ).toBeInTheDocument();

    // party code input
    const codeInput = screen.getByPlaceholderText("------") as HTMLInputElement;
    expect(codeInput).toBeInTheDocument();
  });

  it("uses query param ?code= to initialize party code", () => {
    // code is uppercased and sliced to 6 chars
    setSearchParams("code=abcxyz123");

    render(<PartyPage />);

    const codeInput = screen.getByPlaceholderText("------") as HTMLInputElement;
    expect(codeInput.value).toBe("ABCXYZ");
  });

  it("loads nickname from localStorage on mount", async () => {
    localStorage.setItem("mealslot_nickname", "StoredName");

    render(<PartyPage />);

    const nameInput = screen.getByPlaceholderText(
      "Enter your name",
    ) as HTMLInputElement;

    // effect runs async
    await waitFor(() => {
      expect(nameInput.value).toBe("StoredName");
    });
  });

  it("creates a party successfully and shows PartyClient and Copy button", async () => {
    render(<PartyPage />);

    const nameInput = screen.getByPlaceholderText(
      "Enter your name",
    ) as HTMLInputElement;

    // Type nickname
    fireEvent.change(nameInput, { target: { value: "Alice" } });

    // First fetch call: /api/party/create
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: "ABC123",
        memberId: "member-1",
      }),
    } as any);

    const createButton = screen.getByRole("button", { name: "Create" });
    expect(createButton).toBeEnabled();

    fireEvent.click(createButton);

    // Code input updated
    const codeInput = screen.getByPlaceholderText("------") as HTMLInputElement;
    await waitFor(() => expect(codeInput.value).toBe("ABC123"));

    // PartyClient rendered because activeCode is set
    expect(await screen.findByTestId("party-client")).toBeInTheDocument();

    // Copy button appears
    const copyButton = await screen.findByTitle("Copy code");
    expect(copyButton).toBeInTheDocument();
  });

  it("shows alert when create party fails", async () => {
    render(<PartyPage />);

    const nameInput = screen.getByPlaceholderText(
      "Enter your name",
    ) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "Bob" } });

    (global as any).fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Create issue" }),
    } as any);

    const createButton = screen.getByRole("button", { name: "Create" });
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    fireEvent.click(createButton);

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Create issue"),
    );

    alertSpy.mockRestore();
  });

  it("joins a party successfully", async () => {
    // No initial code from query
    setSearchParams("");

    render(<PartyPage />);

    const nameInput = screen.getByPlaceholderText(
      "Enter your name",
    ) as HTMLInputElement;
    const codeInput = screen.getByPlaceholderText("------") as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "Charlie" } });
    fireEvent.change(codeInput, { target: { value: "ZZZZZZ" } });

    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        memberId: "joined-member",
      }),
    } as any);

    const joinButton = screen.getByRole("button", { name: "Join" });
    expect(joinButton).toBeEnabled();

    fireEvent.click(joinButton);

    // After join, PartyClient should render (activeCode is set)
    expect(await screen.findByTestId("party-client")).toBeInTheDocument();
  });

  it("shows alert when join fails", async () => {
    render(<PartyPage />);

    const nameInput = screen.getByPlaceholderText(
      "Enter your name",
    ) as HTMLInputElement;
    const codeInput = screen.getByPlaceholderText("------") as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "Dana" } });
    fireEvent.change(codeInput, { target: { value: "JOINME" } });

    (global as any).fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Join issue" }),
    } as any);

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const joinButton = screen.getByRole("button", { name: "Join" });
    fireEvent.click(joinButton);

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Join issue"),
    );

    alertSpy.mockRestore();
  });

  it("allows creator to leave party and reloads page", async () => {
    render(<PartyPage />);

    const nameInput = screen.getByPlaceholderText(
      "Enter your name",
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Eve" } });

    // Create party -> isCreator = true
    ;(global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: "LEAVE1",
        memberId: "creator-1",
      }),
    } as any);

    const createButton = screen.getByRole("button", { name: "Create" });
    fireEvent.click(createButton);

    // Wait for PartyClient to confirm activeCode set
    await screen.findByTestId("party-client");

    // Now we should see the Leave button (creator)
    const leaveButton = await screen.findByRole("button", { name: "Leave" });

    const reloadSpy = vi.spyOn(window.location, "reload");

    fireEvent.click(leaveButton);

    expect(reloadSpy).toHaveBeenCalled();
  });

  it("copies the party code to clipboard", async () => {
    render(<PartyPage />);

    const nameInput = screen.getByPlaceholderText(
      "Enter your name",
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Frank" } });

    ;(global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: "COPY12",
        memberId: "creator-2",
      }),
    } as any);

    const createButton = screen.getByRole("button", { name: "Create" });
    fireEvent.click(createButton);

    // Wait for code to appear, then Copy button
    await waitFor(() =>
      expect(
        (screen.getByPlaceholderText("------") as HTMLInputElement).value,
      ).toBe("COPY12"),
    );

    const copyButton = await screen.findByTitle("Copy code");
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("COPY12");
  });

  it("shows Eat Outside section after a party spin and uses geolocation coords", async () => {
    // Join a party so PartyClient appears
    render(<PartyPage />);

    const nameInput = screen.getByPlaceholderText(
      "Enter your name",
    ) as HTMLInputElement;
    const codeInput = screen.getByPlaceholderText("------") as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "Gina" } });
    fireEvent.change(codeInput, { target: { value: "PARTY1" } });

    // 1st fetch: /api/party/join
    ;(global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        memberId: "party-member",
      }),
    } as any);

    const joinButton = screen.getByRole("button", { name: "Join" });
    fireEvent.click(joinButton);

    // PartyClient visible
    await screen.findByTestId("party-client");

    // Trigger onSpin to set spinOccurred = true
    const partySpinBtn = screen.getByTestId("party-spin");
    fireEvent.click(partySpinBtn);

    // Eat Outside section appears
    await screen.findByText("Eat Outside");

    // geolocation success path
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

    // 2nd fetch: /api/places
    ;(global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        venues: [
          {
            id: "v1",
            name: "Geo Venue",
            addr: "123 Geo St",
            rating: 4.5,
            price: "$$",
            url: "https://example.com/geo",
            cuisine: "Italian",
            distance_km: 1.2,
          },
        ],
      }),
    } as any);

    const eatOutsideBtn = screen.getByText("📍 Eat Outside");
    fireEvent.click(eatOutsideBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        "/api/places",
        expect.objectContaining({
          body: expect.stringContaining('"lat":10'),
        }),
      );
    });

    // Venue appears
    expect(await screen.findByText("Geo Venue")).toBeInTheDocument();
  });

  it("falls back to Denver when geolocation errors", async () => {
    render(<PartyPage />);

    const nameInput = screen.getByPlaceholderText(
      "Enter your name",
    ) as HTMLInputElement;
    const codeInput = screen.getByPlaceholderText("------") as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "Hank" } });
    fireEvent.change(codeInput, { target: { value: "PARTY2" } });

    ;(global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        memberId: "member-geo-error",
      }),
    } as any);

    const joinButton = screen.getByRole("button", { name: "Join" });
    fireEvent.click(joinButton);

    await screen.findByTestId("party-client");
    fireEvent.click(screen.getByTestId("party-spin"));

    // Eat Outside section visible
    await screen.findByText("Eat Outside");

    // geolocation present but calls error callback
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_success: any, error: any) => {
          error(new Error("no permission"));
        },
      },
    });

    ;(global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: {
          group1: [
            {
              id: "v2",
              name: "Denver Venue",
              addr: "456 Mile High",
              rating: 4.1,
              price: "$",
              url: "https://example.com/denver",
              cuisine: "American",
              distance_km: 2.5,
            },
          ],
        },
      }),
    } as any);

    const eatOutsideBtn = screen.getByText("📍 Eat Outside");
    fireEvent.click(eatOutsideBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        "/api/places",
        expect.objectContaining({
          body: expect.stringContaining("Denver"),
        }),
      );
    });

    expect(await screen.findByText("Denver Venue")).toBeInTheDocument();
  });

  it("uses locationHint when geolocation is not available and normalizes plain array venues", async () => {
    render(<PartyPage />);

    const nameInput = screen.getByPlaceholderText(
      "Enter your name",
    ) as HTMLInputElement;
    const codeInput = screen.getByPlaceholderText("------") as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "Ivy" } });
    fireEvent.change(codeInput, { target: { value: "PARTY3" } });

    ;(global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        memberId: "member-no-geo",
      }),
    } as any);

    const joinButton = screen.getByRole("button", { name: "Join" });
    fireEvent.click(joinButton);

    await screen.findByTestId("party-client");
    fireEvent.click(screen.getByTestId("party-spin"));

    await screen.findByText("Eat Outside");

    // Remove geolocation from navigator → "geolocation" in navigator === false
    const navCopy = { ...(window.navigator as any) };
    delete navCopy.geolocation;
    Object.defineProperty(window, "navigator", {
      configurable: true,
      value: navCopy,
    });

    ;(global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "v3",
          name: "Array Venue",
          addr: "789 Array Ave",
          rating: 4.8,
          price: "$$$",
          url: "https://example.com/array",
          cuisine: "Fusion",
          distance_km: 0.9,
        },
      ],
    } as any);

    const eatOutsideBtn = screen.getByText("📍 Eat Outside");
    fireEvent.click(eatOutsideBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        "/api/places",
        expect.objectContaining({
          body: expect.stringContaining("Denver"),
        }),
      );
    });

    expect(await screen.findByText("Array Venue")).toBeInTheDocument();
  });

  it("prevents create or join when nickname is empty", () => {
    render(<PartyPage />);

    const createButton = screen.getByRole("button", { name: "Create" });
    const joinButton = screen.getByRole("button", { name: "Join" });

    expect(createButton).toBeDisabled();
    expect(joinButton).toBeDisabled();
  });
});
