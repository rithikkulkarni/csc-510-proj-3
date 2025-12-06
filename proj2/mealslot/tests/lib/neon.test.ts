import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the neon package so we don't hit the real DB
vi.mock("@neondatabase/serverless", () => {
  return {
    neon: vi.fn((url: string) => ({
      url,
      kind: "mock-client",
    })),
  };
});

describe("lib/neon", () => {
  beforeEach(() => {
    // Make sure each test re-evaluates the module with a clean cache
    vi.resetModules();
    delete process.env.DATABASE_URL;
  });

  it("throws if DATABASE_URL is not set", async () => {
    // DATABASE_URL is undefined from beforeEach
    await expect(import("../../lib/neon")).rejects.toThrow(
      "DATABASE_URL is not set",
    );
  });

  it("exports a client created with DATABASE_URL", async () => {
    process.env.DATABASE_URL = "postgres://example-db-url";

    // Import after setting env so the top-level code sees it
    const { client } = await import("../../lib/neon");

    // Grab the mocked neon function to assert on calls
    const { neon } = await import("@neondatabase/serverless");
    const neonMock = neon as unknown as ReturnType<typeof vi.fn>;

    expect(neonMock).toHaveBeenCalledTimes(1);
    expect(neonMock).toHaveBeenCalledWith("postgres://example-db-url");

    // And the exported client is whatever our mock returned
    expect(client).toEqual({
      url: "postgres://example-db-url",
      kind: "mock-client",
    });
  });
});
