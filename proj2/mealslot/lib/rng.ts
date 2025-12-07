/**
 * Deterministic random number generators
 *
 * Provides seed-based, reproducible RNG utilities using a combination
 * of xmur3 hashing and the mulberry32 PRNG. Designed for predictable
 * randomness without relying on Date, Math.random, or secrets.
 */

/**
 * xmur3
 *
 * Lightweight string hashing function that produces a 32-bit seed.
 * Used to convert arbitrary strings into numeric seeds for PRNGs.
 */
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/**
 * mulberry32
 *
 * Fast, simple pseudo-random number generator that outputs values
 * in the range [0, 1). Intended for non-cryptographic use cases
 * such as shuffling, deterministic sampling, or UI randomness.
 */
function mulberry32(a: number) {
  let t = a >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * makeDeterministicRng
 *
 * Creates a deterministic RNG function that returns numbers in [0, 1)
 * based on the provided seed string. The same seed will always produce
 * the same sequence of values.
 */
export function makeDeterministicRng(seed: string): () => number {
  const seedFn = xmur3(seed);
  const a = seedFn();
  return mulberry32(a);
}
