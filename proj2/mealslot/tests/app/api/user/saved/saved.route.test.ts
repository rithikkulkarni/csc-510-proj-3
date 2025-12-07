// tests/app/api/user/saved-meals.routes.unit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Hoist-safe module mocks ---

// Next "server-only" helper – make it a no-op for tests
vi.mock("server-only", () => ({}));

// Prisma mock – only user model is needed here
vi.mock("@/lib/db", () => {
  const prisma = {
    user: {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  } as any;
  return { prisma };
});

// --- Imports that see the mocks above ---

import { prisma } from "../../../../../lib/db";
import * as SavedMealsRoute from "../../../../../app/api/user/saved/route";

const userUpdateMock = prisma.user.update as any;
const userFindUniqueMock = prisma.user.findUnique as any;

describe("saved-meals route unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userUpdateMock.mockResolvedValue({});
    userFindUniqueMock.mockResolvedValue(null);
  });

  /* -------------------- validation & JSON parse -------------------- */

  it("returns 400 with issues when zod validation fails (missing authId)", async () => {
    const req = new Request("http://local/api/user/saved-meals", {
      method: "POST",
      body: JSON.stringify({ savedMeals: ["a", "b"] }), // no authId
    });

    const res = await SavedMealsRoute.POST(req as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("returns 400 when JSON parse fails and body becomes {}", async () => {
    const badReq = {
      json: async () => {
        throw new Error("boom");
      },
    } as any;

    const res = await SavedMealsRoute.POST(badReq);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  /* -------------------- success: savedMeals provided -------------------- */

  it("updates user with savedMeals when provided and returns updated savedMeals", async () => {
    const reqBody = {
      authId: "auth-123",
      savedMeals: ["meal1", "meal2"],
    };

    userFindUniqueMock.mockResolvedValueOnce({
      auth_id: "auth-123",
      savedMeals: ["meal1", "meal2"],
    });

    const req = new Request("http://local/api/user/saved-meals", {
      method: "POST",
      body: JSON.stringify(reqBody),
    });

    const res = await SavedMealsRoute.POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.savedMeals).toEqual(["meal1", "meal2"]);

    // update called with auth_id and savedMeals in data
    expect(userUpdateMock).toHaveBeenCalledTimes(1);
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { auth_id: "auth-123" },
      data: { savedMeals: ["meal1", "meal2"] },
    });

    // findUnique called to fetch updated record
    expect(userFindUniqueMock).toHaveBeenCalledTimes(1);
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { auth_id: "auth-123" },
    });
  });

  /* -------------------- success: savedMeals omitted -------------------- */

  it("updates user without changing savedMeals when savedMeals is omitted and returns [] when user has no savedMeals", async () => {
    const reqBody = {
      authId: "auth-no-meals",
      // savedMeals omitted -> undefined
    };

    // findUnique returns user without savedMeals property
    userFindUniqueMock.mockResolvedValueOnce({
      auth_id: "auth-no-meals",
      // no savedMeals
    });

    const req = new Request("http://local/api/user/saved-meals", {
      method: "POST",
      body: JSON.stringify(reqBody),
    });

    const res = await SavedMealsRoute.POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    // updated?.savedMeals ?? [] => []
    expect(body.savedMeals).toEqual([]);

    // update called with empty data object (spread condition fails)
    expect(userUpdateMock).toHaveBeenCalledTimes(1);
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { auth_id: "auth-no-meals" },
      data: {},
    });

    expect(userFindUniqueMock).toHaveBeenCalledTimes(1);
    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { auth_id: "auth-no-meals" },
    });
  });

  it("returns existing savedMeals when user already has them and savedMeals is omitted", async () => {
    const reqBody = {
      authId: "auth-existing",
      // no savedMeals in request
    };

    userFindUniqueMock.mockResolvedValueOnce({
      auth_id: "auth-existing",
      savedMeals: ["existing1", "existing2"],
    });

    const req = new Request("http://local/api/user/saved-meals", {
      method: "POST",
      body: JSON.stringify(reqBody),
    });

    const res = await SavedMealsRoute.POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.savedMeals).toEqual(["existing1", "existing2"]);

    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { auth_id: "auth-existing" },
      data: {},
    });
  });

  /* -------------------- error path: prisma throws -------------------- */

  it("returns 500 when prisma.user.update throws", async () => {
    const error = new Error("db down");
    userUpdateMock.mockRejectedValueOnce(error);

    const errSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => { /* silence */ });

    const req = new Request("http://local/api/user/saved-meals", {
      method: "POST",
      body: JSON.stringify({
        authId: "auth-err",
        savedMeals: ["x"],
      }),
    });

    const res = await SavedMealsRoute.POST(req as any);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body).toEqual({
      message: "Failed to update saved meals",
    });

    expect(errSpy).toHaveBeenCalled();
    expect(errSpy.mock.calls[0][0]).toBe(
      "Failed to update saved meals",
    );
  });
});
