// tests/app/api/youtube/youtube.route.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

// Hoist-safe mock for Next "server-only" helper
vi.mock("server-only", () => ({}));

/**
 * Helper: re-import the youtube route module with a specific YOUTUBE_API_KEY.
 * Needed because YOUTUBE_KEY is captured at module load time.
 */
async function importYouTubeRouteWithKey(key?: string) {
  const originalKey = process.env.YOUTUBE_API_KEY;

  if (key === undefined) {
    delete process.env.YOUTUBE_API_KEY;
  } else {
    process.env.YOUTUBE_API_KEY = key;
  }

  // Reset module cache so YOUTUBE_KEY is recomputed on import
  vi.resetModules();

  // Re-apply the server-only mock after resetModules
  vi.mock("server-only", () => ({}));

  const mod = await import("../../../../app/api/videos/route");

  // Restore original env
  if (originalKey === undefined) {
    delete process.env.YOUTUBE_API_KEY;
  } else {
    process.env.YOUTUBE_API_KEY = originalKey;
  }

  return mod;
}

afterEach(() => {
  vi.restoreAllMocks();
  // Clean up fetch between tests
  delete (globalThis as any).fetch;
});

describe("YouTube route unit tests", () => {
  /* -------------------- validation & JSON parse -------------------- */

  it("returns 400 BAD_REQUEST when body fails validation", async () => {
    const { POST } = await importYouTubeRouteWithKey("dummy-key");

    const req = new Request("http://local/api/youtube", {
      method: "POST",
      body: JSON.stringify({}), // no dishes
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe("BAD_REQUEST");
    expect(Array.isArray(data.issues)).toBe(true);
    expect(data.issues.length).toBeGreaterThan(0);
  });

  it("returns 400 BAD_REQUEST when JSON parse fails (req.json throws)", async () => {
    const { POST } = await importYouTubeRouteWithKey("dummy-key");

    const badReq = {
      json: async () => {
        throw new Error("boom");
      },
    } as any;

    const res = await POST(badReq);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.code).toBe("BAD_REQUEST");
    expect(Array.isArray(data.issues)).toBe(true);
    expect(data.issues.length).toBeGreaterThan(0);
  });

  /* -------------------- success path with real key -------------------- */

  it("calls YouTube API when key is set and maps results correctly", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        items: [
          {
            id: { videoId: "vid123" },
            snippet: {
              title: "Best Pasta Recipe",
              description: "Step by step pasta recipe",
              thumbnails: {
                default: { url: "https://thumb.test/pasta.jpg" },
              },
            },
          },
        ],
      }),
    });
    (globalThis as any).fetch = fetchSpy;

    const { POST } = await importYouTubeRouteWithKey("test-key");

    const req = new Request("http://local/api/youtube", {
      method: "POST",
      body: JSON.stringify({ dishes: ["Pasta"] }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const data = await res.json();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(data.errors).toEqual([]);
    expect(data.results.Pasta).toHaveLength(1);

    const v = data.results.Pasta[0];
    expect(v.id).toBe("vid123");
    expect(v.title).toBe("Best Pasta Recipe");
    expect(v.description).toBe("Step by step pasta recipe");
    expect(v.url).toBe("https://www.youtube.com/watch?v=vid123");
    expect(v.thumbnail).toBe("https://thumb.test/pasta.jpg");
  });

  it("records an error when YouTube API responds with non-ok status", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue({}),
    });
    (globalThis as any).fetch = fetchSpy;

    const { POST } = await importYouTubeRouteWithKey("test-key");

    const req = new Request("http://local/api/youtube", {
      method: "POST",
      body: JSON.stringify({ dishes: ["Sushi"] }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const data = await res.json();

    // No mapped results for Sushi
    expect(data.results.Sushi).toEqual([]);
    // Error recorded
    expect(data.errors).toContainEqual({
      dish: "Sushi",
      message: "http_503",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("handles errors thrown during search (fetch rejects)", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error("network down"));
    (globalThis as any).fetch = fetchSpy;

    const { POST } = await importYouTubeRouteWithKey("test-key");

    const req = new Request("http://local/api/youtube", {
      method: "POST",
      body: JSON.stringify({ dishes: ["Ramen"] }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const data = await res.json();

    expect(data.results.Ramen).toEqual([]);
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0].dish).toBe("Ramen");
    expect(data.errors[0].message).toBe("network down");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  /* -------------------- stub fallback when YOUTUBE_API_KEY is missing -------------------- */

  it("returns stubbed videos and notice when YOUTUBE_API_KEY is missing", async () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => { /* silence in test */ });

    const fetchSpy = vi.fn();
    (globalThis as any).fetch = fetchSpy;

    const { POST } = await importYouTubeRouteWithKey(undefined);

    const req = new Request("http://local/api/youtube", {
      method: "POST",
      body: JSON.stringify({ dishes: ["Pasta", "Sushi"] }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const data = await res.json();

    // Top-level warning logged on module import
    expect(warnSpy).toHaveBeenCalledWith(
      "Missing YOUTUBE_API_KEY environment variable",
    );

    // searchYouTube short-circuits -> no network calls
    expect(fetchSpy).not.toHaveBeenCalled();

    // Stubbed results for each dish
    expect(Object.keys(data.results).sort()).toEqual(["Pasta", "Sushi"].sort());

    for (const dish of ["Pasta", "Sushi"]) {
      expect(data.results[dish]).toHaveLength(2);
      expect(data.results[dish][0].id).toBe(`${dish}_1`);
      expect(data.results[dish][1].id).toBe(`${dish}_2`);
      expect(data.results[dish][0].url).toBe("https://youtube.com");
      expect(data.results[dish][0].description).toBe("Stubbed recipe video");
    }

    expect(data.errors).toEqual([]);
    expect(data.notice).toContain("YOUTUBE_API_KEY not set");
  });
});
