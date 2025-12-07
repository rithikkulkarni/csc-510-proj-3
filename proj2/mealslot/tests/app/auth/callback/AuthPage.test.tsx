// tests/app/auth/callback/AuthPage.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ----------------------
// Mocks (must NOT capture top-level vars)
// ----------------------

// next/navigation mock – expose internal fns via __mocks
vi.mock("next/navigation", () => {
  const replace = vi.fn();
  const get = vi.fn();

  return {
    useRouter: () => ({ replace }),
    useSearchParams: () => ({ get }),
    __mocks: { replace, get },
  };
});

// stack client mock
vi.mock("@/stack/client", () => {
  const client = {
    getUser: vi.fn(),
  };
  return { client };
});

// actions mock
vi.mock("@/app/actions", () => {
  return {
    getUserDetails: vi.fn(),
  };
});

// UserContext mock
vi.mock("@/app/context/UserContext", () => {
  const refreshUser = vi.fn();
  return {
    useUser: () => ({ refreshUser }),
  };
});

// ----------------------
// Imports AFTER mocks
// ----------------------
import * as NextNavigation from "next/navigation";
import { client } from "../../../../stack/client";
import { getUserDetails } from "../../../../app/actions";
import AuthCallbackPage from "../../../../app/auth/callback/page";

// Grab the internal mock fns from next/navigation
const navMocks = (NextNavigation as any).__mocks;
const mockReplace = navMocks.replace as any;
const mockGetSearchParam = navMocks.get as any;

// Grab the mock fns from the mocked modules
const getUserMock = (client as any).getUser as any;
const getUserDetailsMock = getUserDetails as any;

describe("AuthCallbackPage", () => {
  let originalFetch: any;
  let fetchMock: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    originalFetch = (globalThis as any).fetch;
    fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;

    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => { /* silence in tests */ });

    mockReplace.mockReset();
    mockGetSearchParam.mockReset();
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    consoleErrorSpy.mockRestore();
  });

  /* -------------------- no neon user branch -------------------- */

  it("redirects to / when no Neon user is found", async () => {
    mockGetSearchParam.mockReturnValue("login");
    getUserMock.mockResolvedValue(null);

    const setItemSpy = vi.spyOn(window.localStorage, "setItem");

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(getUserMock).toHaveBeenCalled();
    });

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getUserDetailsMock).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
  });

  /* -------------------- signup flow, fetch ok, profile truthy -------------------- */

  it("handles signup: creates user via API, saves profile, refreshes and redirects to /account", async () => {
    mockGetSearchParam.mockReturnValue("signup");

    getUserMock.mockResolvedValue({
      id: "user-1",
      displayName: "Alice",
    });

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ created: true }),
      text: vi.fn().mockResolvedValue(""),
    });

    const profile = { id: "user-1", name: "Alice" };
    getUserDetailsMock.mockResolvedValue(profile);

    const setItemSpy = vi.spyOn(window.localStorage, "setItem");

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/account");
    });

    // API called
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/user/create");
    expect(options.method).toBe("POST");

    // Profile fetched & stored
    expect(getUserDetailsMock).toHaveBeenCalledWith("user-1");
    expect(setItemSpy).toHaveBeenCalledWith(
      "userProfile",
      JSON.stringify(profile),
    );

    setItemSpy.mockRestore();
  });

  /* -------------------- login flow, fetch not ok, profile falsy -------------------- */

  it("handles login with failing create API and no profile", async () => {
    // action param missing -> defaults to "login" -> redirect "/"
    mockGetSearchParam.mockReturnValue(null);

    getUserMock.mockResolvedValue({
      id: "user-2",
      displayName: "Bob",
    });

    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn().mockResolvedValue("error text"),
    });

    getUserDetailsMock.mockResolvedValue(null);

    const setItemSpy = vi.spyOn(window.localStorage, "setItem");

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });

    // API was called even though it failed
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // No profile stored when getUserDetails returns null
    expect(setItemSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
  });

  /* -------------------- fetch throws (catch branch) -------------------- */

  it("handles errors when user creation API fetch throws", async () => {
    mockGetSearchParam.mockReturnValue("login");

    getUserMock.mockResolvedValue({
      id: "user-3",
      displayName: "Cara",
    });

    fetchMock.mockRejectedValue(new Error("network down"));
    getUserDetailsMock.mockResolvedValue(null);

    render(<AuthCallbackPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });

    // Error path: console.error called from catch
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Still calls getUserDetails for coverage
    expect(getUserDetailsMock).toHaveBeenCalledWith("user-3");
  });
});
