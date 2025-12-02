import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Stub "server-only" so it doesn't break in Vitest env
vi.mock("server-only", () => ({}));

import { videoStubsFor, type YtStub } from "@/lib/youtube"; // ⬅️ adjust path if needed

const YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

let originalEnvKey: string | undefined;
let originalFetch: typeof globalThis.fetch | undefined;

beforeEach(() => {
  originalEnvKey = process.env.YOUTUBE_API_KEY;
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  if (originalEnvKey !== undefined) {
    process.env.YOUTUBE_API_KEY = originalEnvKey;
  } else {
    delete process.env.YOUTUBE_API_KEY;
  }

  if (originalFetch) {
    globalThis.fetch = originalFetch;
  } else {
    delete (globalThis as any).fetch;
  }

  vi.resetModules();
  vi.clearAllMocks();
});

describe("videoStubsFor - stub branch (no YOUTUBE_API_KEY)", () => {
  it("returns deterministic stub videos when no API key is set", async () => {
    delete process.env.YOUTUBE_API_KEY;

    const query = "chicken curry";

    const vids1 = await videoStubsFor(query);
    const vids2 = await videoStubsFor(query);

    // Should not call fetch at all
    expect(globalThis.fetch).toBe(originalFetch);

    // Should always return 4 stub videos
    expect(vids1).toHaveLength(4);
    expect(vids2).toHaveLength(4);

    // Deterministic across calls
    expect(vids1).toEqual(vids2);

    // Basic shape checks
    for (const v of vids1) {
      expect(v.id).toBeTruthy();
      expect(v.title).toContain(query);
      expect(v.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
      expect(v.thumbnail).toMatch(/^https:\/\/i\.ytimg\.com\/vi\//);
    }
  });
});

describe("videoStubsFor - YouTube API branch", () => {
  it("calls YouTube API when YOUTUBE_API_KEY is set and uses results (with padding)", async () => {
    process.env.YOUTUBE_API_KEY = "test-youtube-key";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: { videoId: "realVideo1" },
            snippet: {
              title: "Real Video 1",
              thumbnails: {
                high: { url: "https://thumbs/real1_high.jpg" },
              },
            },
          },
          {
            id: { videoId: "realVideo2" },
            snippet: {
              title: "Real Video 2",
              thumbnails: {
                default: { url: "https://thumbs/real2_default.jpg" },
              },
            },
          },
        ],
      }),
    } as any);

    globalThis.fetch = mockFetch;

    const query = "pasta recipe";
    const vids = await videoStubsFor(query);

    // Verify fetch was called with proper URL
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0]!;
    expect(typeof url).toBe("string");
    expect((url as string).startsWith(YT_SEARCH_URL)).toBe(true);
    expect((options as any).method).toBe("GET");

    // We returned 2 items from API, so function should pad to 4 total
    expect(vids).toHaveLength(4);

    // First two should reflect API results
    expect(vids[0]).toEqual<YtStub>({
      id: "realVideo1",
      title: "Real Video 1",
      url: "https://www.youtube.com/watch?v=realVideo1",
      thumbnail: "https://thumbs/real1_high.jpg",
    });

    expect(vids[1]).toEqual<YtStub>({
      id: "realVideo2",
      title: "Real Video 2",
      url: "https://www.youtube.com/watch?v=realVideo2",
      thumbnail: "https://thumbs/real2_default.jpg",
    });

    // The remaining two are padded stub entries (we don't assert exact IDs,
    // just that they're valid, non-empty, YouTube-like URLs).
    const padded = vids.slice(2);
    for (const v of padded) {
      expect(v.id).toBeTruthy();
      expect(v.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
      expect(typeof v.title).toBe("string");
    }
  });

  it("falls back to stub videos when YouTube API returns non-ok", async () => {
    process.env.YOUTUBE_API_KEY = "test-youtube-key";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as any);

    globalThis.fetch = mockFetch;

    const query = "error case";
    const vids = await videoStubsFor(query);

    // Should have tried to call YouTube
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // But since it failed, we should get stub-like results
    expect(vids).toHaveLength(4);
    for (let i = 0; i < vids.length; i++) {
      const v = vids[i]!;
      expect(v.id).toBeTruthy();
      expect(v.title).toContain(query);
      expect(v.title).toMatch(/tutorial/i);
      expect(v.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
      expect(v.thumbnail).toMatch(/^https:\/\/i\.ytimg\.com\/vi\//);
    }
  });

  it("falls back to stub videos when fetch throws", async () => {
    process.env.YOUTUBE_API_KEY = "test-youtube-key";

    const mockFetch = vi.fn().mockRejectedValue(new Error("network failure"));

    globalThis.fetch = mockFetch;

    const query = "network fails";
    const vids = await videoStubsFor(query);

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Same expectations as stub path
    expect(vids).toHaveLength(4);
    for (const v of vids) {
      expect(v.id).toBeTruthy();
      expect(v.title).toContain(query);
      expect(v.title).toMatch(/tutorial/i);
      expect(v.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
      expect(v.thumbnail).toMatch(/^https:\/\/i\.ytimg\.com\/vi\//);
    }
  });
});
