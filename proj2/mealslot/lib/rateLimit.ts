/**
 * Simple in-memory rate limiter
 *
 * Implements a token-bucket rate limit keyed by client IP address.
 * Designed for lightweight protection of API routes (e.g., spin actions)
 * in a single-node / serverless-friendly context.
 *
 * Notes:
 * - Uses process memory (not shared across instances).
 * - Suitable for low-stakes throttling, not strict security guarantees.
 */

import { NextRequest } from "next/server";

type Bucket = { tokens: number; last: number };

const buckets = new Map<string, Bucket>();
const CAP = 20; // maximum tokens (spins) per refill window
const REFILL_MS = 60_000; // refill window duration (1 minute)

/**
 * withRateLimit
 *
 * Applies a token-bucket rate limit per client IP.
 * Returns a 429 Response when the limit is exceeded,
 * or null if the request is allowed to proceed.
 */
export function withRateLimit(req: NextRequest): Response | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const now = Date.now();
  const b = buckets.get(ip) ?? { tokens: CAP, last: now };

  const elapsed = now - b.last;
  if (elapsed > 0) {
    const refill = Math.floor((elapsed / REFILL_MS) * CAP);
    b.tokens = Math.min(CAP, b.tokens + refill);
    b.last = now;
  }

  if (b.tokens <= 0) {
    const retryAfterMs = Math.max(0, REFILL_MS - (now - b.last));
    return Response.json(
      { code: "RATE_LIMIT", retryAfterMs },
      { status: 429 },
    );
  }

  b.tokens -= 1;
  buckets.set(ip, b);

  return null;
}
