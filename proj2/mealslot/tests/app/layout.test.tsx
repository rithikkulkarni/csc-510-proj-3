// tests/app/layout.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, expect, describe, it } from "vitest";
import RootLayout, { metadata, dynamic } from "../../app/layout";

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
