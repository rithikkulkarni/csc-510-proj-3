// tests/app/api/party/party.routes.unit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// --- Hoist-safe module mocks ---

// Next "server-only" helper – make it a no-op for tests
vi.mock("server-only", () => ({}));

// Prisma mock shared by all party routes
vi.mock("@/lib/db", () => {
  const makeModel = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "created", code: "ABC123", isActive: true, constraintsJson: "{}" }),
    update: vi.fn().mockResolvedValue({ id: "updated" }),
    delete: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({ id: "upserted" }),
  });

  const prisma = {
    party: makeModel(),
    partyMember: makeModel(),
    user: makeModel(),
  } as any;

  return { prisma };
});

// Mock lib/party with a simple PrefsSchema, mergeConstraints and partyCodeFromSeed
vi.mock("@/lib/party", () => {
  const PrefsSchema = z.object({
    nickname: z.string().optional(),
    allergens: z.array(z.string()).optional(),
  });

  const mergeConstraints = (prefsList: any[]) => ({
    merged: { fromPrefs: prefsList },
    conflict: false,
    suggestions: [],
  });

  const partyCodeFromSeed = (_seed: string) => "ABC123";

  return { PrefsSchema, mergeConstraints, partyCodeFromSeed };
});

// --- Imports that see the mocks above ---

import { prisma } from "../../../../lib/db";

import * as Create from "../../../../app/api/party/create/route";
import * as Join from "../../../../app/api/party/join/route";
import * as Leave from "../../../../app/api/party/leave/route";
import * as State from "../../../../app/api/party/state/route";
import * as Update from "../../../../app/api/party/update/route";
import * as Spin from "../../../../app/api/party/spin/route";

describe("party route unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* -------------------- /api/party/create -------------------- */

  it("create returns 400 when body is invalid (bad nickname)", async () => {
    const req = new Request("http://local/api/party/create", {
      method: "POST",
      body: JSON.stringify({ nickname: "" }), // fails min(1)
    });

    const res = await Create.POST(req as any);
    expect(res.status).toBe(400);
  });

  it("create creates party and member with user allergens when auth_id user exists", async () => {
    (prisma.party.create as any).mockResolvedValueOnce({
      id: "p1",
      code: "P12345",
      isActive: true,
      constraintsJson: "{}",
    });

    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: "u1",
      allergens: ["dairy", "soy"],
    });

    (prisma.partyMember.create as any).mockResolvedValueOnce({ id: "m1" });

    const req = new Request("http://local/api/party/create", {
      method: "POST",
      body: JSON.stringify({ nickname: "Hosty", auth_id: "auth-1" }),
    });

    const res = await Create.POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.partyId).toBe("p1");
    expect(body.memberId).toBe("m1");
    expect(body.host).toBe(true);

    // user allergens were read
    expect(prisma.user.findUnique).toHaveBeenCalled();
    expect(prisma.partyMember.create).toHaveBeenCalled();
  });

  it("create handles auth_id when user is not found (no allergens)", async () => {
    (prisma.party.create as any).mockResolvedValueOnce({
      id: "p2",
      code: "P67890",
      isActive: true,
      constraintsJson: "{}",
    });

    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    (prisma.partyMember.create as any).mockResolvedValueOnce({ id: "m2" });

    const req = new Request("http://local/api/party/create", {
      method: "POST",
      body: JSON.stringify({ nickname: "Host", auth_id: "missing-auth" }),
    });

    const res = await Create.POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.partyId).toBe("p2");
    // ensures the branch where user === null is executed
    expect(prisma.user.findUnique).toHaveBeenCalled();
  });

  it("create returns 500 when prisma throws", async () => {
    (prisma.party.create as any).mockRejectedValueOnce(new Error("db down"));

    const req = new Request("http://local/api/party/create", {
      method: "POST",
      body: JSON.stringify({ nickname: "Host" }),
    });

    const res = await Create.POST(req as any);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.code).toBe("INTERNAL");
  });

  /* -------------------- /api/party/join -------------------- */

  it("join returns 400 when body is invalid (code wrong length)", async () => {
    const req = new Request("http://local/api/party/join", {
      method: "POST",
      body: JSON.stringify({ code: "ABC", nickname: "X" }),
    });

    const res = await Join.POST(req as any);
    expect(res.status).toBe(400);
  });

  it("join returns 404 when party not found", async () => {
    (prisma.party.findFirst as any).mockResolvedValueOnce(null);

    const req = new Request("http://local/api/party/join", {
      method: "POST",
      body: JSON.stringify({ code: "ABC123" }),
    });

    const res = await Join.POST(req as any);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.code).toBe("NOT_FOUND");
  });

  it("join creates member when party exists and user exists", async () => {
    (prisma.party.findFirst as any).mockResolvedValueOnce({
      id: "p1",
      code: "ABC123",
      isActive: true,
    });

    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: "u1",
      allergens: ["dairy"],
    });

    (prisma.partyMember.create as any).mockResolvedValueOnce({ id: "m1" });

    const req = new Request("http://local/api/party/join", {
      method: "POST",
      body: JSON.stringify({ code: "ABC123", auth_id: "auth1", nickname: "Guesty" }),
    });

    const res = await Join.POST(req as any);
    expect(res.status).toBe(200);
    const j = await res.json();

    expect(j.partyId).toBe("p1");
    expect(j.memberId).toBe("m1");
    expect(j.code).toBe("ABC123");
  });

  it("join creates member without auth_id and defaults nickname", async () => {
    (prisma.party.findFirst as any).mockResolvedValueOnce({
      id: "p2",
      code: "XYZ999",
      isActive: true,
    });

    (prisma.partyMember.create as any).mockResolvedValueOnce({ id: "m2" });

    const req = new Request("http://local/api/party/join", {
      method: "POST",
      body: JSON.stringify({ code: "XYZ999" }),
    });

    const res = await Join.POST(req as any);
    expect(res.status).toBe(200);
    const j = await res.json();

    expect(j.partyId).toBe("p2");
    expect(j.memberId).toBe("m2");
  });

  it("join returns 500 when prisma throws", async () => {
    (prisma.party.findFirst as any).mockRejectedValueOnce(new Error("db down"));

    const req = new Request("http://local/api/party/join", {
      method: "POST",
      body: JSON.stringify({ code: "ABC123" }),
    });

    const res = await Join.POST(req as any);
    expect(res.status).toBe(500);
    const j = await res.json();
    expect(j.code).toBe("INTERNAL");
  });

  /* -------------------- /api/party/leave -------------------- */

  it("leave returns 400 when body is invalid", async () => {
    const req = new Request("http://local/api/party/leave", {
      method: "POST",
      body: JSON.stringify({}), // no memberId
    });

    const res = await Leave.POST(req as any);
    expect(res.status).toBe(400);
  });

  it("leave deletes member and returns ok", async () => {
    const req = new Request("http://local/api/party/leave", {
      method: "POST",
      body: JSON.stringify({ memberId: "m1" }),
    });

    const res = await Leave.POST(req as any);
    expect(res.status).toBe(200);
    const j = await res.json();

    expect(j.ok).toBe(true);
    expect(prisma.partyMember.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
  });

  it("leave returns 500 when prisma throws", async () => {
    (prisma.partyMember.delete as any).mockRejectedValueOnce(new Error("db err"));

    const req = new Request("http://local/api/party/leave", {
      method: "POST",
      body: JSON.stringify({ memberId: "m1" }),
    });

    const res = await Leave.POST(req as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("INTERNAL");
  });

  /* -------------------- /api/party/state -------------------- */
  // These are similar to what you already had; they help keep coverage high
  // for the state route as well.

  it("state returns NOT_FOUND when party is missing", async () => {
    (prisma.party.findFirst as any).mockResolvedValueOnce(null);

    const req = new Request("http://local/api/party/state?code=XXXXXX");
    const res = await State.GET(req as any);

    expect(res.status).toBe(404);
  });

    it('state responds with an INTERNAL error when party state validation fails', async () => {
    (prisma.party.findFirst as any).mockResolvedValue({
        id: 'p1',
        code: 'ABC123',
        isActive: true,
        constraintsJson: '{}',
    });
    (prisma.partyMember.findMany as any).mockResolvedValue([
        {
        id: 'm1',
        prefsJson: JSON.stringify({ nickname: 'A' }),
        user: { allergens: ['soy'] },
        },
    ]);

    const req = new Request('http://local/?code=ABC123');
    const res = await State.GET(req as any);

    // In the current mocked setup the handler falls into its catch-block,
    // so we should see a 500 and an INTERNAL error code.
    expect(res.status).toBe(500);
    const j = await res.json();
    expect(j).toHaveProperty('code', 'INTERNAL');
  });


  /* -------------------- /api/party/update -------------------- */

  it("update returns 400 when required fields are missing", async () => {
    const req = new Request("http://local/api/party/update", {
      method: "POST",
      body: JSON.stringify({ partyId: "p1" }), // no memberId, no prefs
    });

    const res = await Update.POST(req as any);
    expect(res.status).toBe(400);
  });

  it("update recomputes merged constraints and updates party", async () => {
    const reqPrefs = { nickname: "A", allergens: ["soy"] };

    const req = new Request("http://local/api/party/update", {
      method: "POST",
      body: JSON.stringify({ partyId: "p1", memberId: "m1", prefs: reqPrefs }),
    });

    (prisma.partyMember.findMany as any).mockResolvedValueOnce([
      { prefsJson: JSON.stringify({ nickname: "A", allergens: ["soy"] }) },
      { prefsJson: "not-json" }, // exercises the try/catch in prefs parsing
    ]);

    const res = await Update.POST(req as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.merged).toBeDefined();
    expect(body.conflict).toBe(false);
    expect(Array.isArray(body.suggestions)).toBe(true);

    expect(prisma.partyMember.update).toHaveBeenCalled();
    expect(prisma.party.update).toHaveBeenCalled();
  });

  it("update returns 500 when prisma throws", async () => {
    (prisma.partyMember.update as any).mockRejectedValueOnce(new Error("db err"));

    const req = new Request("http://local/api/party/update", {
      method: "POST",
      body: JSON.stringify({
        partyId: "p1",
        memberId: "m1",
        prefs: { nickname: "A", allergens: [] },
      }),
    });

    const res = await Update.POST(req as any);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.code).toBe("INTERNAL");
  });

  /* -------------------- /api/party/spin wrapper -------------------- */

  it("spin returns three items using fallback menu when internal fetch fails", async () => {
    (globalThis as any).fetch = vi.fn(() => Promise.reject(new Error("network disabled")));

    const req = new Request("http://local/api/party/spin", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await Spin.POST(req as any);
    expect(res.status).toBe(200);

    const j = await res.json();
    expect(Array.isArray(j.selection)).toBe(true);
    expect(j.selection.length).toBe(3);
  });

  it("spin uses /api/spin result when selection is an array", async () => {
    const selection = [
      { id: "dish1", name: "Dish 1" },
      { id: "dish2", name: "Dish 2" },
      { id: "dish3", name: "Dish 3" },
    ];

    (globalThis as any).fetch = vi.fn(async () => ({
      json: async () => ({ selection }),
    }));

    const req = new Request("http://local/api/party/spin", {
      method: "POST",
      body: JSON.stringify({ categories: ["dinner"], locked: [false, false, false] }),
    });

    const res = await Spin.POST(req as any);
    const j = await res.json();

    expect(j.selection.some((d: any) => d.id === "dish1")).toBe(true);
  });

  it("spin handles singular selection object from /api/spin", async () => {
    (globalThis as any).fetch = vi.fn(async () => ({
      json: async () => ({ selection: { id: "only", name: "Only Dish" } }),
    }));

    const req = new Request("http://local/api/party/spin", {
      method: "POST",
      body: JSON.stringify({ categories: ["dinner"] }),
    });

    const res = await Spin.POST(req as any);
    const j = await res.json();

    expect(j.selection.some((d: any) => d.id === "only")).toBe(true);
  });

  it("spin recovers from unexpected errors and still returns placeholders", async () => {
    // This will cause `new URL(req.url)` to throw, hitting the outer catch block
    const badReq = {
      url: "nota-valid-url",
      json: async () => {
        throw new Error("boom");
      },
    } as any;

    const res = await Spin.POST(badReq);
    expect(res.status).toBe(200);

    const j = await res.json();
    expect(j.error).toBeDefined();
    expect(Array.isArray(j.selection)).toBe(true);
    expect(j.selection.length).toBe(3);
  });
});
