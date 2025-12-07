// tests/app/api/dishes/dishes.route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Hoisted-safe mocks ---

// Next.js server-only helper – noop in tests
vi.mock("server-only", () => ({}));

// Mock Prisma client so no real DB or env vars are needed
vi.mock("@/lib/db", () => ({
  prisma: {
    dish: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// --- Imports that use the mocks above ---
import { GET, POST } from "../../../../app/api/dishes/route";
import { prisma } from "../../../../lib/db";

const prismaMock = prisma as unknown as {
  dish: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

describe("app/api/dishes/route.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  /* ------------------------ GET ------------------------ */

  it("GET returns 400 with issues when category validation fails (empty string)", async () => {
    const req = {
      url: "http://localhost/api/dishes?category=",
    } as any;

    const res = await GET(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("issues");
    expect(Array.isArray(body.issues)).toBe(true);

    // Should not hit the DB
    expect(prismaMock.dish.findMany).not.toHaveBeenCalled();
  });

  it("GET returns dishes when no category is specified", async () => {
    const rows = [
      { id: "1", name: "Burger", category: "main" },
      { id: "2", name: "Salad", category: "veggie" },
    ];

    prismaMock.dish.findMany.mockResolvedValueOnce(rows as any);

    const req = {
      url: "http://localhost/api/dishes",
    } as any;

    const res = await GET(req);

    expect(prismaMock.dish.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ name: "asc" }],
      take: 250,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(rows);
  });

  it("GET filters dishes by category when category is provided", async () => {
    const rows = [{ id: "3", name: "Pasta", category: "main" }];

    prismaMock.dish.findMany.mockResolvedValueOnce(rows as any);

    const req = {
      url: "http://localhost/api/dishes?category=main",
    } as any;

    const res = await GET(req);

    expect(prismaMock.dish.findMany).toHaveBeenCalledWith({
      where: { category: "main" },
      orderBy: [{ name: "asc" }],
      take: 250,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(rows);
  });

  /* ------------------------ POST ------------------------ */

  it("POST returns 400 when body validation fails", async () => {
    // costBand out of range will fail zod validation
    const badBody = {
      name: "Bad Dish",
      category: "main",
      costBand: 0,
      timeBand: 2,
    };

    const req = {
      json: vi.fn().mockResolvedValue(badBody),
    } as any;

    const res = await POST(req);

    expect(req.json).toHaveBeenCalled();
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("issues");
    expect(Array.isArray(body.issues)).toBe(true);

    expect(prismaMock.dish.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.dish.create).not.toHaveBeenCalled();
  });

  it("POST returns 400 when req.json throws (parse error path)", async () => {
    const req = {
      json: vi.fn().mockRejectedValue(new Error("bad json")),
    } as any;

    const res = await POST(req);

    expect(req.json).toHaveBeenCalled();
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("issues");
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("POST returns 409 when a dish with the derived ID already exists", async () => {
    const body = {
      // no id -> derived from category + name
      name: "Fancy Burger",
      category: "main",
      costBand: 2,
      timeBand: 2,
    };

    const req = {
      json: vi.fn().mockResolvedValue(body),
    } as any;

    // id should be "main_fancy_burger"
    prismaMock.dish.findUnique.mockResolvedValueOnce({ id: "main_fancy_burger" } as any);

    const res = await POST(req);

    expect(prismaMock.dish.findUnique).toHaveBeenCalledWith({
      where: { id: "main_fancy_burger" },
    });

    expect(prismaMock.dish.create).not.toHaveBeenCalled();

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json).toEqual({
      code: "ALREADY_EXISTS",
      message: "Dish with id 'main_fancy_burger' already exists.",
    });
  });

  it("POST creates a new dish when an explicit id is provided (slugified)", async () => {
    const body = {
      id: "My Custom ID!!",
      name: "Pizza Margherita",
      category: "main",
      tags: ["Italian", "Cheesy"],
      allergens: ["Dairy", "Gluten"],
      costBand: 3,
      timeBand: 2,
      isHealthy: true,
      ytQuery: "pizza margherita recipe",
    };

    const req = {
      json: vi.fn().mockResolvedValue(body),
    } as any;

    // slugify("My Custom ID!!") -> "my_custom_id"
    prismaMock.dish.findUnique.mockResolvedValueOnce(null as any);

    const created = {
      id: "my_custom_id",
      ...body,
      tags: "Italian,Cheesy",
      allergens: "Dairy,Gluten",
    };

    prismaMock.dish.create.mockResolvedValueOnce(created as any);

    const res = await POST(req);

    expect(prismaMock.dish.findUnique).toHaveBeenCalledWith({
      where: { id: "my_custom_id" },
    });

    expect(prismaMock.dish.create).toHaveBeenCalledWith({
      data: {
        id: "my_custom_id",
        name: "Pizza Margherita",
        category: "main",
        tags: "Italian,Cheesy",
        allergens: "Dairy,Gluten",
        costBand: 3,
        timeBand: 2,
        isHealthy: true,
        ytQuery: "pizza margherita recipe",
      },
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual(created);
  });

  it("POST derives id from category + name and uses defaults for tags/allergens/isHealthy/ytQuery", async () => {
    const body = {
      // no id, no tags/allergens/isHealthy/ytQuery
      name: "Tomato Soup Deluxe",
      category: "soup",
      costBand: 1,
      timeBand: 1,
    };

    const req = {
      json: vi.fn().mockResolvedValue(body),
    } as any;

    // slugify("Tomato Soup Deluxe") => "tomato_soup_deluxe"
    const expectedId = "soup_tomato_soup_deluxe";

    prismaMock.dish.findUnique.mockResolvedValueOnce(null as any);

    const created = {
      id: expectedId,
      name: "Tomato Soup Deluxe",
      category: "soup",
      tags: "",
      allergens: "",
      costBand: 1,
      timeBand: 1,
      isHealthy: false,
      ytQuery: null,
    };

    prismaMock.dish.create.mockResolvedValueOnce(created as any);

    const res = await POST(req);

    expect(prismaMock.dish.findUnique).toHaveBeenCalledWith({
      where: { id: expectedId },
    });

    expect(prismaMock.dish.create).toHaveBeenCalledWith({
      data: {
        id: expectedId,
        name: "Tomato Soup Deluxe",
        category: "soup",
        tags: "",
        allergens: "",
        costBand: 1,
        timeBand: 1,
        isHealthy: false,
        ytQuery: null,
      },
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual(created);
  });
});
