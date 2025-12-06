import { describe, it, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma so importing the route modules doesn't try to load the real engine
vi.mock("@prisma/client", () => {
  // We only need a stub. Since every test here is skipped,
  // the methods are never actually called.
  class PrismaClient {
    // Add model properties if your routes access them,
    // e.g. dish = { findMany: vi.fn() } as any;
    $disconnect = vi.fn();
  }

  return { PrismaClient };
});

// Now it's safe to import route handlers – they will see the mocked PrismaClient
import * as SpinRoute from "@/app/api/spin/route";
import * as RecipeRoute from "@/app/api/recipe/route";
import * as PlacesRoute from "@/app/api/places/route";

// Removed placeholder skipped tests to keep unit suite focused.

function toNextRequest(path: string, method: string, body?: any) {
  const url = new URL(`http://localhost${path}`);
  const init: RequestInit = {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  };
  // NextRequest can be constructed from the native Request
  return new NextRequest(new Request(url, init));
}

describe("API contracts (stub)", () => {
  // Minimal sanity test retained so the file is discoverable by the runner.
  it("sanity: placeholder after removing skipped tests", () => {
    expect(true).toBe(true);
  });
});
