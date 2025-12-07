// tests/app/dietaryPreferencesSection.test.tsx
import React from "react";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ----------------------
// Hoisted mocks & shared state
// ----------------------
const {
  getAllAllergensMock,
  updateUserDetailsMock,
  mockSetUserHoisted,
} = vi.hoisted(() => ({
  getAllAllergensMock: vi.fn(),
  updateUserDetailsMock: vi.fn(),
  mockSetUserHoisted: vi.fn(),
}));

let currentUser: any = {
  id: "user-1",
  allergens: ["Eggs", "Peanuts"],
};

const mockSetUser = mockSetUserHoisted;

// ----------------------
// Module mocks
// ----------------------
vi.mock("../../app/context/UserContext", () => ({
  useUser: () => ({
    user: currentUser,
    setUser: mockSetUser,
  }),
}));

vi.mock("../../app/actions", () => ({
  getAllAllergens: getAllAllergensMock,
  updateUserDetails: updateUserDetailsMock,
}));

// Import component AFTER mocks
import DietaryPreferencesSection from "../../app/account/DietaryPreferencesSection";

describe("DietaryPreferencesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = {
      id: "user-1",
      allergens: ["Eggs", "Peanuts"],
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads allergens and selects user's allergens", async () => {
    getAllAllergensMock.mockResolvedValueOnce([
      "Eggs",
      "Peanuts",
      "Milk",
      "Soy",
    ]);

    render(<DietaryPreferencesSection />);

    await waitFor(() => {
      expect(getAllAllergensMock).toHaveBeenCalled();
    });

    expect(screen.getByText("Eggs ✓")).toBeInTheDocument();
    expect(screen.getByText("Peanuts ✓")).toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Soy")).toBeInTheDocument();

    expect(
      screen.getByText("Selected: Eggs, Peanuts"),
    ).toBeInTheDocument();
  });

  it("shows 'No allergens selected.' when intersection is empty", async () => {
    currentUser = {
      id: "user-2",
      allergens: ["Gluten"],
    };

    getAllAllergensMock.mockResolvedValueOnce(["Milk", "Soy"]);

    render(<DietaryPreferencesSection />);

    await waitFor(() => {
      expect(getAllAllergensMock).toHaveBeenCalled();
    });

    expect(
      screen.getByText("No allergens selected."),
    ).toBeInTheDocument();
  });

  it("toggles allergens on and off and clears success message", async () => {
    getAllAllergensMock.mockResolvedValueOnce(["Eggs", "Peanuts", "Milk"]);

    currentUser = {
      id: "user-3",
      allergens: ["Eggs"],
    };

    render(<DietaryPreferencesSection />);

    await waitFor(() => {
      expect(screen.getByText("Eggs ✓")).toBeInTheDocument();
    });

    updateUserDetailsMock.mockResolvedValueOnce({});

    const saveButton = screen.getByText("Save All");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateUserDetailsMock).toHaveBeenCalledWith("user-3", {
        allergens: ["Eggs"],
      });
    });

    expect(
      screen.getByText("Preferences saved successfully!"),
    ).toBeInTheDocument();

    // Toggle Eggs off
    fireEvent.click(screen.getByText("Eggs ✓"));
    expect(
      screen.queryByText("Preferences saved successfully!"),
    ).not.toBeInTheDocument();

    // Toggle Milk on
    fireEvent.click(screen.getByText("Milk"));
    expect(screen.getByText("Selected: Milk")).toBeInTheDocument();
  });

  it("saves preferences successfully and updates user context", async () => {
    getAllAllergensMock.mockResolvedValueOnce(["Eggs", "Peanuts", "Milk"]);

    currentUser = {
      id: "user-4",
      allergens: ["Eggs"],
    };

    render(<DietaryPreferencesSection />);

    await waitFor(() => {
      expect(screen.getByText("Eggs ✓")).toBeInTheDocument();
    });

    // Add Milk as another preference
    fireEvent.click(screen.getByText("Milk"));

    let resolvePromise: () => void;
    updateUserDetailsMock.mockImplementation(
      () =>
        new Promise<void>((res) => {
          resolvePromise = res;
        }),
    );

    fireEvent.click(screen.getByText("Save All"));

    // While saving
    expect(screen.getByText("Saving...")).toBeInTheDocument();

    // Finish save
    resolvePromise!();

    await waitFor(() => {
      expect(updateUserDetailsMock).toHaveBeenCalledWith("user-4", {
        allergens: ["Eggs", "Milk"],
      });
    });

    expect(mockSetUser).toHaveBeenCalledWith({
      id: "user-4",
      allergens: ["Eggs", "Milk"],
    });

    expect(screen.getByText("Save All")).toBeInTheDocument();
    expect(
      screen.getByText("Preferences saved successfully!"),
    ).toBeInTheDocument();
  });

  it("shows error message when saving fails", async () => {
    getAllAllergensMock.mockResolvedValueOnce(["Eggs"]);

    currentUser = {
      id: "user-5",
      allergens: ["Eggs"],
    };

    render(<DietaryPreferencesSection />);

    await waitFor(() => {
      expect(screen.getByText("Eggs ✓")).toBeInTheDocument();
    });

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    updateUserDetailsMock.mockRejectedValueOnce(
      new Error("DB failure"),
    );

    fireEvent.click(screen.getByText("Save All"));

    await waitFor(() => {
      expect(updateUserDetailsMock).toHaveBeenCalled();
    });

    expect(
      screen.getByText("Failed to save preferences."),
    ).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("does nothing when user is null on save", async () => {
    getAllAllergensMock.mockResolvedValueOnce(["Eggs", "Peanuts"]);
    currentUser = null;

    render(<DietaryPreferencesSection />);

    await waitFor(() => {
      expect(getAllAllergensMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText("Save All"));

    expect(updateUserDetailsMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("No allergens selected."),
    ).toBeInTheDocument();
  });
});
