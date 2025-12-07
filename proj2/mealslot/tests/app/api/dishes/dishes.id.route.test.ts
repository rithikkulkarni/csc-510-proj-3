// tests/app/api/dishes/dishes.id.route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Next server-only helper – noop in tests
vi.mock("server-only", () => ({}));

// Mock Prisma DB
vi.mock("../../../../lib/db", () => ({
  prisma: {
    dish: {
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Import AFTER mocks so we get the mocked versions
import { DELETE, PATCH } from "../../../../app/api/dishes/[id]/route";
import { prisma } from "../../../../lib/db";

const prismaMock = prisma as unknown as {
  dish: {
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe("app/api/dishes/[id]/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // -------------------------
  // DELETE
  // -------------------------
  it("DELETE returns 204 when deletion succeeds", async () => {
    prismaMock.dish.delete.mockResolvedValueOnce({} as any);

    const res = await DELETE({} as any, {
      params: Promise.resolve({ id: "dish-123" }),
    } as any);

    expect(prismaMock.dish.delete).toHaveBeenCalledWith({
      where: { id: "dish-123" },
    });
    expect(res.status).toBe(204);
  });

  it("DELETE returns 404 when deletion throws", async () => {
    prismaMock.dish.delete.mockRejectedValueOnce(new Error("not found"));

    const res = await DELETE({} as any, {
      params: Promise.resolve({ id: "missing-id" }),
    } as any);

    expect(prismaMock.dish.delete).toHaveBeenCalledWith({
      where: { id: "missing-id" },
    });
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body).toEqual({ error: "Not found" });
  });

  // -------------------------
  // PATCH – validation failure
  // -------------------------
  it("PATCH returns 400 with issues when body fails validation", async () => {
    // costBand outside 1–3 range will fail zod validation
    const badBody = { costBand: 99 };

    const req = {
      json: vi.fn().mockResolvedValue(badBody),
    } as any;

    const res = await PATCH(req, {
      params: Promise.resolve({ id: "dish-123" }),
    } as any);

    expect(req.json).toHaveBeenCalled();
    // prisma.update should never be called on invalid body
    expect(prismaMock.dish.update).not.toHaveBeenCalled();
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("issues");
    expect(Array.isArray(body.issues)).toBe(true);
  });

  // -------------------------
  // PATCH – success with full body
  // -------------------------
  it("PATCH updates dish and returns updated record on success", async () => {
    const body = {
      name: "New Name",
      category: "Lunch",
      tags: ["spicy", "vegan"],
      allergens: ["Eggs", "Peanut"],
      costBand: 2,
      timeBand: 3,
      isHealthy: true,
      ytQuery: "pasta recipe",
    };

    const req = {
      json: vi.fn().mockResolvedValue(body),
    } as any;

    const updatedRecord = {
      id: "dish-123",
      name: "New Name",
      category: "Lunch",
      tags: "spicy,vegan",
      allergens: "Eggs,Peanut",
      costBand: 2,
      timeBand: 3,
      isHealthy: true,
      ytQuery: "pasta recipe",
    };

    prismaMock.dish.update.mockResolvedValueOnce(updatedRecord as any);

    const res = await PATCH(req, {
      params: Promise.resolve({ id: "dish-123" }),
    } as any);

    expect(req.json).toHaveBeenCalled();
    expect(prismaMock.dish.update).toHaveBeenCalledWith({
      where: { id: "dish-123" },
      data: {
        name: "New Name",
        category: "Lunch",
        tags: "spicy,vegan",
        allergens: "Eggs,Peanut",
        costBand: 2,
        timeBand: 3,
        isHealthy: true,
        ytQuery: "pasta recipe",
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(updatedRecord);
  });

  // -------------------------
  // PATCH – success with empty body
  // (exercises the "false" side of all d.xxx !== undefined checks)
  // -------------------------
  it("PATCH with empty body still calls update with no data changes", async () => {
    const req = {
      json: vi.fn().mockResolvedValue({}),
    } as any;

    prismaMock.dish.update.mockResolvedValueOnce({
      id: "dish-123",
    } as any);

    const res = await PATCH(req, {
      params: Promise.resolve({ id: "dish-123" }),
    } as any);

    expect(req.json).toHaveBeenCalled();
    expect(prismaMock.dish.update).toHaveBeenCalledWith({
      where: { id: "dish-123" },
      data: {},
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ id: "dish-123" });
  });

  // -------------------------
  // PATCH – update throws
  // -------------------------
  it("PATCH returns 404 when prisma.update throws", async () => {
    const body = {
      name: "Will fail",
    };

    const req = {
      json: vi.fn().mockResolvedValue(body),
    } as any;

    prismaMock.dish.update.mockRejectedValueOnce(new Error("not found"));

    const res = await PATCH(req, {
      params: Promise.resolve({ id: "missing-id" }),
    } as any);

    expect(prismaMock.dish.update).toHaveBeenCalled();
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json).toEqual({ error: "Not found" });
  });
});
