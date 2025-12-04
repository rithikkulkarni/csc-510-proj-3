import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import UserMenu from "@/components/UserMenu";
import React from 'react';

// Mock next/link for Vitest (JSDOM cannot handle Next.js routing)
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) =>
    <a href={href} {...props}>{children}</a>
}));

describe("UserMenu component", () => {
  it("renders with default user name 'Guest'", () => {
    render(<UserMenu />);
    expect(screen.getByText("Hi Guest")).toBeInTheDocument();
  });

  it("renders with a provided user name", () => {
    render(<UserMenu userName="Rithik" />);
    expect(screen.getByText("Hi Rithik")).toBeInTheDocument();
  });

  it("opens the dropdown when clicked and shows menu items", async () => {
    render(<UserMenu userName="TestUser" />);

    // Click the menu button
    fireEvent.click(screen.getByRole("button", { name: /Hi TestUser/i }));

    // Expect dropdown items to appear
    expect(await screen.findByText("Account Setting")).toBeInTheDocument();
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(screen.getByText("Dietary Preferences")).toBeInTheDocument();
  });

  it("each menu item links to the correct href", async () => {
    render(<UserMenu />);

    fireEvent.click(screen.getByRole("button", { name: /Hi Guest/i }));

    expect(await screen.findByText("Account Setting")).toHaveAttribute(
      "href",
      "/handler/sign-up"
    );
    expect(screen.getByText("Favorites")).toHaveAttribute(
      "href",
      "/favorites"
    );
    expect(screen.getByText("Dietary Preferences")).toHaveAttribute(
      "href",
      "/preferences"
    );
  });
});
