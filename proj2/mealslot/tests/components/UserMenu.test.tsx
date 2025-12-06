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
    render(<UserMenu user={{ name: "Guest" }} onSignOut={() => { }} />);
    expect(screen.getByText("Hi Guest")).toBeInTheDocument();
  });

  it("renders with a provided user name", () => {
    render(<UserMenu user={{ name: "Rithik" }} onSignOut={() => { }} />);
    expect(screen.getByText("Hi Rithik")).toBeInTheDocument();
  });

  it("opens the dropdown when clicked and shows menu items", async () => {
    render(<UserMenu user={{ name: "TestUser" }} onSignOut={() => { }} />);

    // Click the menu button
    fireEvent.click(screen.getByRole("button", { name: /Hi TestUser/i }));

    // Expect dropdown items to appear
    expect(await screen.findByText("Account Setting")).toBeInTheDocument();
    expect(screen.getByText("Saved Meals")).toBeInTheDocument();
  });

  it("each menu item links to the correct href", async () => {
    render(<UserMenu user={{ name: "Guest" }} onSignOut={() => { }} />);

    fireEvent.click(screen.getByRole("button", { name: /Hi Guest/i }));

    expect(await screen.findByText("Account Setting")).toHaveAttribute(
      "href",
      "/account"
    );
    expect(screen.getByText("Saved Meals")).toHaveAttribute(
      "href",
      "/favorites"
    );
  });
});
