/** @vitest-environment happy-dom */

import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, vi } from "vitest";

// Mock lucide-react Crown icon
vi.mock("lucide-react", () => ({
  __esModule: true,
  Crown: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="crown-icon" {...props} />
  ),
}));

// Mock party lib: only DietEnum is used at runtime
vi.mock("@/lib/party", () => ({
  __esModule: true,
  DietEnum: {
    options: ["omnivore", "vegetarian", "vegan"],
  },
  // PrefsSchema is only used for typing; runtime value doesn't matter
  PrefsSchema: {},
}));

import PartySidebar from "../../../components/party/PartySidebar";

afterEach(() => {
  cleanup();
});

describe("PartySidebar", () => {
  it("renders members with host crown, self label, and online count", () => {
    const onPrefChange = vi.fn();

    const livePeers = [
      { id: "host-1", nickname: "Hosty", creator: true, lastSeen: Date.now() },
      { id: "me-1", nickname: "Me", creator: false, lastSeen: Date.now() },
      { id: "other-1", nickname: "Other", creator: false, lastSeen: Date.now() },
    ];

    render(
      <PartySidebar
        livePeers={livePeers}
        hostId="host-1"
        memberId="me-1"
        prefs={{ diet: "omnivore", allergens: [] }}
        allergenOptions={[]}
        onPrefChange={onPrefChange}
      />
    );

    // Online count
    expect(screen.getByText(/3 online/i)).toBeInTheDocument();

    // Host has crown and is styled as host
    expect(screen.getByText("Hosty")).toBeInTheDocument();
    expect(screen.getByTestId("crown-icon")).toBeInTheDocument();

    // Self has "(you)" suffix
    expect(screen.getByText(/Me \(you\)/)).toBeInTheDocument();

    // Other member appears with just nickname
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("renders diet chips, highlights active diet, and calls onPrefChange when toggled", async () => {
    const user = userEvent.setup();
    const onPrefChange = vi.fn();

    render(
      <PartySidebar
        livePeers={[]}
        hostId={null}
        memberId={null}
        prefs={{ diet: "vegan", allergens: [] }}
        allergenOptions={[]}
        onPrefChange={onPrefChange}
      />
    );

    // Diet section label
    expect(screen.getByText(/diet/i)).toBeInTheDocument();

    const veganChip = screen.getByRole("button", { name: /vegan/i });
    const vegChip = screen.getByRole("button", { name: /vegetarian/i });
    const omniChip = screen.getByRole("button", { name: /omnivore/i });

    // Only vegan should be active
    expect(veganChip).toHaveAttribute("aria-pressed", "true");
    expect(vegChip).toHaveAttribute("aria-pressed", "false");
    expect(omniChip).toHaveAttribute("aria-pressed", "false");

    // Click vegetarian → should call onPrefChange with { diet: "vegetarian" }
    await user.click(vegChip);
    expect(onPrefChange).toHaveBeenCalledTimes(1);
    expect(onPrefChange).toHaveBeenCalledWith({ diet: "vegetarian" });
  });

  it("renders allergen chips, removes allergen when active chip is clicked, and adds when inactive", async () => {
    const user = userEvent.setup();
    const onPrefChange = vi.fn();

    render(
      <PartySidebar
        livePeers={[]}
        hostId={null}
        memberId={null}
        prefs={{ diet: "omnivore", allergens: ["peanuts"] }}
        allergenOptions={["peanuts", "shellfish_free"]}
        onPrefChange={onPrefChange}
      />
    );

    // Allergens label
    expect(screen.getByText(/allergens/i)).toBeInTheDocument();

    const peanutsChip = screen.getByRole("button", { name: /peanuts/i });
    // "shellfish_free" displays as "shellfish free"
    const shellfishChip = screen.getByRole("button", { name: /shellfish free/i });

    // Initial state: peanuts active, shellfish_free inactive
    expect(peanutsChip).toHaveAttribute("aria-pressed", "true");
    expect(shellfishChip).toHaveAttribute("aria-pressed", "false");

    // Clicking active "peanuts" should remove it from allergens
    await user.click(peanutsChip);
    expect(onPrefChange).toHaveBeenCalledTimes(1);
    expect(onPrefChange).toHaveBeenCalledWith({ allergens: [] });

    // Clicking inactive "shellfish free" should add it alongside any existing ones
    await user.click(shellfishChip);
    expect(onPrefChange).toHaveBeenCalledTimes(2);
    expect(onPrefChange).toHaveBeenLastCalledWith({
      allergens: ["peanuts", "shellfish_free"],
    });
  });

  it("handles undefined allergens array by starting from empty set", async () => {
    const user = userEvent.setup();
    const onPrefChange = vi.fn();

    render(
      <PartySidebar
        livePeers={[]}
        hostId={null}
        memberId={null}
        prefs={{ diet: "omnivore", allergens: undefined as unknown as string[] }}
        allergenOptions={["eggs"]}
        onPrefChange={onPrefChange}
      />
    );

    const eggsChip = screen.getByRole("button", { name: /eggs/i });
    expect(eggsChip).toHaveAttribute("aria-pressed", "false");

    await user.click(eggsChip);

    expect(onPrefChange).toHaveBeenCalledTimes(1);
    expect(onPrefChange).toHaveBeenCalledWith({ allergens: ["eggs"] });
  });
});
