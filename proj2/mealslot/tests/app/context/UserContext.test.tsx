// tests/app/context/UserContext.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ----------------------
// Mocks
// ----------------------

// Mock stack client (same module path used in UserContext)
vi.mock("@/stack/client", () => {
  const client = {
    getUser: vi.fn(),
  };
  return { client };
});

// ----------------------
// Imports AFTER mocks
// ----------------------
import { client } from "../../../stack/client";
import * as Actions from "../../../app/actions";
import { UserProvider, useUser } from "../../../app/context/UserContext";

const getUserMock = (client as any).getUser as any;

describe("UserContext / UserProvider", () => {
  let getUserDetailsSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    getUserDetailsSpy = vi.spyOn(Actions, "getUserDetails");
    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => { /* silence in tests */ });
  });

  afterEach(() => {
    getUserDetailsSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  function Consumer() {
    const { user } = useUser();
    return (
      <div>
        <div data-testid="user-name">{user ? user.name : "none"}</div>
        <div data-testid="saved-count">
          {user?.savedMeals ? user.savedMeals.length : 0}
        </div>
        <div data-testid="allergen-count">
          {user?.allergens ? user.allergens.length : 0}
        </div>
      </div>
    );
  }

  /* -------------------- success: neonUser + profile -------------------- */

  it("loads user on mount when neonUser and profile exist", async () => {
    getUserMock.mockResolvedValue({
      id: "u1",
      displayName: "Alice",
    });

    getUserDetailsSpy.mockResolvedValue({
      name: "Alice",
      savedMeals: ["m1"],
      allergens: ["nuts"],
    });

    render(
      <UserProvider>
        <Consumer />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-name")).toHaveTextContent("Alice");
    });

    expect(screen.getByTestId("saved-count")).toHaveTextContent("1");
    expect(screen.getByTestId("allergen-count")).toHaveTextContent("1");

    expect(getUserMock).toHaveBeenCalledTimes(1);
    expect(getUserDetailsSpy).toHaveBeenCalledWith("u1");
  });

  /* -------------------- neonUser is null -------------------- */

  it("sets user to null when client.getUser returns null", async () => {
    getUserMock.mockResolvedValue(null);
    getUserDetailsSpy.mockResolvedValue({
      name: "ShouldNotBeUsed",
    });

    render(
      <UserProvider>
        <Consumer />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(getUserMock).toHaveBeenCalled();
    });

    expect(screen.getByTestId("user-name")).toHaveTextContent("none");
    expect(getUserDetailsSpy).not.toHaveBeenCalled();
  });

  /* -------------------- profile is null -------------------- */

  it("sets user to null when getUserDetails returns null", async () => {
    getUserMock.mockResolvedValue({ id: "u2" });
    getUserDetailsSpy.mockResolvedValue(null);

    render(
      <UserProvider>
        <Consumer />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(getUserMock).toHaveBeenCalled();
    });

    expect(getUserDetailsSpy).toHaveBeenCalledWith("u2");
    expect(screen.getByTestId("user-name")).toHaveTextContent("none");
  });

  /* -------------------- error path inside refreshUser -------------------- */

  it("logs error and sets user null when refreshUser throws", async () => {
    getUserMock.mockResolvedValue({ id: "u3" });
    getUserDetailsSpy.mockRejectedValue(new Error("boom"));

    render(
      <UserProvider>
        <Consumer />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(getUserMock).toHaveBeenCalled();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(screen.getByTestId("user-name")).toHaveTextContent("none");
  });
});

describe("useUser hook behavior outside provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function OutsideConsumer() {
    const { user, setUser, refreshUser } = useUser();
    // Call them just to ensure they exist and are callable
    setUser(user);
    void refreshUser();
    return (
      <div data-testid="outside-user">
        {user === null ? "null-user" : "non-null"}
      </div>
    );
  }

  it("returns a safe stub when NODE_ENV is 'test' and no provider", () => {
    // By default in Vitest, NODE_ENV === "test"
    const { getByTestId } = render(<OutsideConsumer />);

    expect(getByTestId("outside-user")).toHaveTextContent("null-user");
  });

  it("throws when used outside provider and NODE_ENV is not 'test'", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const BadConsumer = () => {
      return <OutsideConsumer />;
    };

    expect(() => render(<BadConsumer />)).toThrow(
      "useUser must be used within a UserProvider",
    );

    process.env.NODE_ENV = originalEnv;
  });
});
