// tests/lib/rateLimit.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { withRateLimit } from "../../lib/rateLimit"; // ⬅️ adjust path if needed

// These mirror the constants in rateLimit.ts
const CAP = 20;
const REFILL_MS = 60_000;

// Minimal fake "NextRequest" that only supports the headers.get() usage
function makeReq(headers: Record<string, string> = {}): any {
  return {
    headers: {
      get(name: string): string | null {
        const key = Object.keys(headers).find(
          (k) => k.toLowerCase() === name.toLowerCase()
        );
        return key ? headers[key] ?? null : null; // ← FIXED: always returns string | null
      },
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("withRateLimit", () => {
  it("allows up to CAP requests for a given IP then rate-limits", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    const req = makeReq({ "x-real-ip": "10.0.0.1" });

    // First CAP requests should be allowed (null response)
    for (let i = 0; i < CAP; i++) {
      const res = withRateLimit(req);
      expect(res).toBeNull();
    }

    // Next request should be blocked
    const blocked = withRateLimit(req);
    expect(blocked).not.toBeNull();

    if (!blocked) return;

    expect(blocked.status).toBe(429);

    const body = (await blocked.json()) as any;
    expect(body.code).toBe("RATE_LIMIT");
    expect(typeof body.retryAfterMs).toBe("number");
    expect(body.retryAfterMs).toBeGreaterThanOrEqual(0);
    expect(body.retryAfterMs).toBeLessThanOrEqual(REFILL_MS);
  });

  it("tracks rate limit buckets separately per IP", () => {
    const ip1Req = makeReq({ "x-real-ip": "192.168.0.1" });
    const ip2Req = makeReq({ "x-real-ip": "192.168.0.2" });

    // Exhaust IP1
    for (let i = 0; i < CAP; i++) {
      const res = withRateLimit(ip1Req);
      expect(res).toBeNull();
    }
    const blocked = withRateLimit(ip1Req);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);

    // IP2 should still be allowed
    const res2 = withRateLimit(ip2Req);
    expect(res2).toBeNull();
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const reqForwarded = makeReq({
      "x-forwarded-for": "1.2.3.4, 5.6.7.8", // client IP should be 1.2.3.4
      "x-real-ip": "9.9.9.9",
    });

    const reqRealOnly = makeReq({
      "x-real-ip": "9.9.9.9",
    });

    // Burn through CAP requests for the forwarded IP (1.2.3.4)
    for (let i = 0; i < CAP; i++) {
      const res = withRateLimit(reqForwarded);
      expect(res).toBeNull();
    }
    const blockedForwarded = withRateLimit(reqForwarded);
    expect(blockedForwarded).not.toBeNull();
    expect(blockedForwarded?.status).toBe(429);

    // Now request using only x-real-ip=9.9.9.9 should still be allowed
    const resRealOnly = withRateLimit(reqRealOnly);
    expect(resRealOnly).toBeNull();
  });

  it("defaults to 127.0.0.1 when no IP headers are present", () => {
    const req = makeReq();

    // Should treat all these as from 127.0.0.1 and apply CAP
    for (let i = 0; i < CAP; i++) {
      const res = withRateLimit(req);
      expect(res).toBeNull();
    }
    const blocked = withRateLimit(req);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
  });

  it("refills tokens after REFILL_MS for the same IP", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    const req = makeReq({ "x-real-ip": "203.0.113.1" });

    // Exhaust bucket
    for (let i = 0; i < CAP; i++) {
      const res = withRateLimit(req);
      expect(res).toBeNull();
    }
    const blocked = withRateLimit(req);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);

    // Advance time by REFILL_MS to trigger refill
    vi.setSystemTime(new Date(Date.now() + REFILL_MS));

    const resAfterRefill = withRateLimit(req);
    expect(resAfterRefill).toBeNull();
  });
});
