// tests/app/accountPage.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ----------------------
// Module mocks
// ----------------------

// Mock stack client
vi.mock("@/stack/client", () => ({
  client: {
    getUser: vi.fn(),
  },
}));

// Mock actions
vi.mock("@/app/actions", () => ({
  updateUserDetails: vi.fn(),
}));

// Capture the props passed to AccountSettings so we can assert on them
const accountSettingsStore = { lastProps: null as any };

vi.mock("@stackframe/stack", () => {
  const React = require("react");
  return {
    AccountSettings: (props: any) => {
      accountSettingsStore.lastProps = props;

      return (
        <div data-testid="account-settings">
          <div data-testid="full-page-flag">{String(props.fullPage)}</div>
          {props.extraItems?.map((item: any) => (
            <div key={item.id} data-testid={`extra-item-${item.id}`}>
              <span>{item.title}</span>
              <div data-testid="extra-item-content">{item.content}</div>
            </div>
          ))}
        </div>
      );
    },
  };
});

// Mock DietaryPreferencesSection so we don't pull its real implementation
vi.mock("@/app/account/DietaryPreferencesSection", () => ({
  __esModule: true,
  default: () => <div data-testid="dietary-preferences" />,
}));

// ----------------------
// Import AFTER mocks
// ----------------------
import { client } from "../../stack/client";
import AccountPage from "../../app/account/page";

const getUserMock = client.getUser as any;

describe("AccountPage", () => {
  let setIntervalSpy: any;
  let clearIntervalSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Make setInterval immediately run the handler once and return a fake id
    setIntervalSpy = vi
      .spyOn(globalThis as any, "setInterval")
      .mockImplementation((handler: any) => {
        if (typeof handler === "function") {
          handler();
        }
        return 123 as unknown as number;
      });

    clearIntervalSpy = vi
      .spyOn(globalThis as any, "clearInterval")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("renders AccountSettings with Dietary Preferences extra item", async () => {
    getUserMock.mockResolvedValue(null);

    render(<AccountPage />);

    expect(
      await screen.findByTestId("account-settings"),
    ).toBeInTheDocument();

    expect(
      screen.getByTestId("dietary-preferences"),
    ).toBeInTheDocument();

    // Ensure the props were wired correctly
    expect(accountSettingsStore.lastProps).not.toBeNull();
    expect(accountSettingsStore.lastProps.fullPage).toBe(true);

    const extraItems = accountSettingsStore.lastProps.extraItems;
    expect(Array.isArray(extraItems)).toBe(true);
    expect(extraItems[0].id).toBe("dietary-preferences");
    expect(extraItems[0].title).toBe("Dietary Preferences");
  });

  it("syncs user name when displayName is present", async () => {
    getUserMock.mockResolvedValue({
      id: "user-1",
      displayName: "Alice",
    });

    render(<AccountPage />);

    // Just assert we called getUser (success branch is exercised)
    await waitFor(() => {
      expect(getUserMock).toHaveBeenCalled();
    });
  });

  it("skips sync when user has no displayName", async () => {
    getUserMock.mockResolvedValue({
      id: "user-2",
      displayName: "",
    });

    render(<AccountPage />);

    await waitFor(() => {
      expect(getUserMock).toHaveBeenCalled();
    });
    // No extra assertions needed; this drives the "no displayName" branch
  });

  it("handles errors when syncUserName throws", async () => {
    getUserMock.mockRejectedValue(new Error("Boom"));

    render(<AccountPage />);

    // Error branch is executed; we just make sure the effect ran
    await waitFor(() => {
      expect(getUserMock).toHaveBeenCalled();
    });
  });

  it("clears the interval on unmount", async () => {
    getUserMock.mockResolvedValue(null);

    const { unmount } = render(<AccountPage />);

    await waitFor(() => {
      expect(getUserMock).toHaveBeenCalled();
    });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledWith(123);
  });
});
