// tests/app/api/user/update.routes.unit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Hoist-safe module mocks ---

// Mock the server-only side if you ever add it to this route later
vi.mock("server-only", () => ({}));

// Mock the updateUserDetails server action
vi.mock("@/app/actions", () => {
  return {
    updateUserDetails: vi.fn(),
  };
});

// --- Imports that see the mocks above ---

import { updateUserDetails } from "../../../../../app/actions";
import * as UpdateRoute from "../../../../../app/api/user/update/route";

const updateUserDetailsMock = updateUserDetails as any;

describe("user update route unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateUserDetailsMock.mockResolvedValue({
      id: "user-1",
      name: "Alice",
    });
  });

  /* -------------------- validation & JSON parse -------------------- */

  it("returns 400 when userId is missing", async () => {
    const req = new Request("http://local/api/user/update", {
      method: "POST",
      body: JSON.stringify({ name: "Alice" }),
    });

    const res = await UpdateRoute.POST(req as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toEqual({ error: "User ID is required" });

    // action should not be called
    expect(updateUserDetailsMock).not.toHaveBeenCalled();
  });

  it("returns 400 when name is missing/empty", async () => {
    const req = new Request("http://local/api/user/update", {
      method: "POST",
      body: JSON.stringify({ userId: "u1" }), // no name
    });

    const res = await UpdateRoute.POST(req as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toEqual({ error: "Name is required" });

    expect(updateUserDetailsMock).not.toHaveBeenCalled();
  });

  it("returns 400 when name is only whitespace", async () => {
    const req = new Request("http://local/api/user/update", {
      method: "POST",
      body: JSON.stringify({ userId: "u1", name: "   " }),
    });

    const res = await UpdateRoute.POST(req as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toEqual({ error: "Name is required" });

    expect(updateUserDetailsMock).not.toHaveBeenCalled();
  });

  it("returns 400 when name is not a string", async () => {
    const req = new Request("http://local/api/user/update", {
      method: "POST",
      body: JSON.stringify({ userId: "u1", name: 123 }),
    });

    const res = await UpdateRoute.POST(req as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toEqual({ error: "Name is required" });

    expect(updateUserDetailsMock).not.toHaveBeenCalled();
  });

  it("returns 400 when JSON parse fails (req.json throws)", async () => {
    const badReq = {
      json: async () => {
        throw new Error("boom");
      },
    } as any;

    const res = await UpdateRoute.POST(badReq);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
  });

  /* -------------------- success path -------------------- */

  it("trims name, calls updateUserDetails, and returns updated user", async () => {
    updateUserDetailsMock.mockResolvedValueOnce({
      id: "user-123",
      name: "Alice",
    });

    const req = new Request("http://local/api/user/update", {
      method: "POST",
      body: JSON.stringify({ userId: "user-123", name: "  Alice  " }),
    });

    const res = await UpdateRoute.POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user).toEqual({ id: "user-123", name: "Alice" });

    // Name should be trimmed before calling the action
    expect(updateUserDetailsMock).toHaveBeenCalledTimes(1);
    expect(updateUserDetailsMock).toHaveBeenCalledWith("user-123", {
      name: "Alice",
    });
  });

  /* -------------------- error path -------------------- */

  it("returns 500 when updateUserDetails throws", async () => {
    const error = new Error("db down");
    updateUserDetailsMock.mockRejectedValueOnce(error);

    const errSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => { /* silence */ });

    const req = new Request("http://local/api/user/update", {
      method: "POST",
      body: JSON.stringify({ userId: "user-err", name: "Bob" }),
    });

    const res = await UpdateRoute.POST(req as any);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });

    expect(errSpy).toHaveBeenCalled();
    expect(errSpy.mock.calls[0][0]).toBe("Update user error:");
  });
});
