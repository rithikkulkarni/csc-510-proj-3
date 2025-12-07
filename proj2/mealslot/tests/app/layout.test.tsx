// tests/app/layout.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, expect, describe } from "vitest";
import RootLayout, { metadata, dynamic } from "@/app/layout";

// Mock Stackframe provider + theme to avoid real Stack Auth behavior
vi.mock("@stackframe/stack", () => ({
  StackProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stack-provider">{children}</div>
  ),
  StackTheme: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stack-theme">{children}</div>
  ),
}));

// Mock the Stack server app so it doesn't try to read env vars
vi.mock("@/stack/server", () => ({
  stackServerApp: { mocked: true },
}));

// Mock the server header so we can assert it's rendered
vi.mock("@/components/HeaderServer", () => ({
  __esModule: true,
  default: () => <header data-testid="header-server" />,
}));

describe("RootLayout metadata & config", () => {
  it("exports correct dynamic mode and metadata", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(metadata.title).toBe("MealSlot");
    expect(metadata.description).toBe("Spin for meals that fit your mood");
  });
});

describe("RootLayout component", () => {
  it("renders html, head script, header, providers, and children", () => {
    const childText = "Hello from child";

    render(
      <RootLayout>
        <div data-testid="child">{childText}</div>
      </RootLayout>,
    );

    // <html lang="en">
    const html = document.documentElement;
    expect(html.lang).toBe("en");

    // Body classes
    const body = document.body;
    expect(body.className).toContain("min-h-screen");
    expect(body.className).toContain("bg-white");
    expect(body.className).toContain("dark:bg-neutral-950");
    expect(body.className).toContain("dark:text-neutral-100");

    // no-FoUC script is injected in <head>
    const script = document.querySelector("head script");
    expect(script).not.toBeNull();
    expect(script!.textContent).toContain("localStorage.getItem('theme')");
    expect(script!.textContent).toContain("window.__flipTheme");

    // Providers & header rendered (via mocks)
    expect(screen.getByTestId("stack-provider")).toBeInTheDocument();
    expect(screen.getByTestId("stack-theme")).toBeInTheDocument();
    expect(screen.getByTestId("header-server")).toBeInTheDocument();

    // Children rendered inside layout
    expect(screen.getByTestId("child")).toHaveTextContent(childText);
  });
});
