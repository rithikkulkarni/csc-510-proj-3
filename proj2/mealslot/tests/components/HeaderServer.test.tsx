// tests/components/HeaderServer.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import "@testing-library/jest-dom/vitest";

// ---- Hoist-safe mocks ----

// Mock the stack server app
vi.mock("@/stack/server", () => ({
  stackServerApp: {
    getUser: vi.fn(),
  },
}));

// Mock server actions
vi.mock("@/app/actions", () => ({
  ensureUserInDB: vi.fn(),
  getUserDetails: vi.fn(),
}));

// Mock next/font/google so HeaderClient can import fonts without blowing up
vi.mock("next/font/google", () => ({
  Bungee: () => ({ className: "font-bungee" }),
  Sora: () => ({ className: "font-sora" }),
}));

// ---- Imports that see the mocks ----
import { stackServerApp } from "../../stack/server";
import { ensureUserInDB, getUserDetails } from "../../app/actions";
import HeaderServer from "../../components/HeaderServer";

const getUserMock = stackServerApp.getUser as Mock;
const ensureUserInDBMock = ensureUserInDB as unknown as Mock;
const getUserDetailsMock = getUserDetails as unknown as Mock;

describe("HeaderServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns HeaderClient element with null serverUser when there is no authenticated Neon user", async () => {
    getUserMock.mockResolvedValueOnce(null);

    const element = (await HeaderServer()) as any;

    // Should render some React element
    expect(element).toBeTruthy();
    // serverUser should be null
    expect(element.props.serverUser).toBeNull();

    // No DB calls when there's no user
    expect(ensureUserInDBMock).not.toHaveBeenCalled();
    expect(getUserDetailsMock).not.toHaveBeenCalled();
  });

  it("ensures user in DB and preloads full profile when Neon user exists", async () => {
    const neonUser = { id: "u1", displayName: "Alice" };
    getUserMock.mockResolvedValueOnce(neonUser);

    const ensuredUser = { id: "u1", name: "Alice Ensured" };
    const fullProfile = { id: "u1", name: "Alice Full", savedMeals: ["m1"] };

    ensureUserInDBMock.mockResolvedValueOnce(ensuredUser);
    getUserDetailsMock.mockResolvedValueOnce(fullProfile);

    const element = (await HeaderServer()) as any;

    // Ensure user creation/upsert is called
    expect(ensureUserInDBMock).toHaveBeenCalledWith({
      id: "u1",
      displayName: "Alice",
    });

    // Full profile loaded when serverUser is truthy
    expect(getUserDetailsMock).toHaveBeenCalledWith("u1");

    // React element contains the profile
    expect(element.props.serverUser).toEqual(fullProfile);
  });

  it("does not preload profile when ensureUserInDB returns null", async () => {
    const neonUser = { id: "u2", displayName: "Bob" };
    getUserMock.mockResolvedValueOnce(neonUser);

    // Simulate failure / missing record in DB
    ensureUserInDBMock.mockResolvedValueOnce(null);

    const element = (await HeaderServer()) as any;

    expect(ensureUserInDBMock).toHaveBeenCalled();
    expect(getUserDetailsMock).not.toHaveBeenCalled();

    // serverUser stays null
    expect(element.props.serverUser).toBeNull();
  });

  it("catches errors from stackServerApp and logs them, returning HeaderClient with null serverUser", async () => {
    const error = new Error("boom");
    getUserMock.mockRejectedValueOnce(error);

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => { /* silence in tests */ });

    const element = (await HeaderServer()) as any;

    // Error path exercised
    expect(consoleSpy).toHaveBeenCalled();
    const joined = consoleSpy.mock.calls
      .map((c: unknown[]) => c.map(String).join(" "))
      .join(" ");
    expect(joined).toMatch(/HeaderServer: Failed to load user/);

    expect(element.props.serverUser).toBeNull();

    consoleSpy.mockRestore();
  });
});
