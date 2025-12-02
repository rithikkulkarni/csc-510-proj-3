// tests/lib/rng.test.ts
import { describe, it, expect } from "vitest";
import { makeDeterministicRng } from "@/lib/rng"; // ⬅️ adjust path if needed

describe("makeDeterministicRng", () => {
  it("produces the same sequence for the same seed", () => {
    const rng1 = makeDeterministicRng("seed-123");
    const rng2 = makeDeterministicRng("seed-123");

    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());

    expect(seq1).toEqual(seq2);
  });

  it("produces different sequences for different seeds (practically)", () => {
    const rng1 = makeDeterministicRng("seed-123");
    const rng2 = makeDeterministicRng("seed-456");

    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());

    // Not mathematically guaranteed, but extremely likely
    expect(seq1).not.toEqual(seq2);
  });

  it("always returns values in [0, 1)", () => {
    const rng = makeDeterministicRng("range-test");

    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("keeps sequences independent across instances with the same seed", () => {
    const rngA = makeDeterministicRng("same-seed");
    const rngB = makeDeterministicRng("same-seed");

    // Advance rngA a bit
    const aFirst = rngA();
    const aSecond = rngA();

    // Now start rngB freshly – should match what rngA did at the beginning
    const bFirst = rngB();
    const bSecond = rngB();

    expect(aFirst).toBeCloseTo(bFirst, 12);
    expect(aSecond).toBeCloseTo(bSecond, 12);

    // And if we continue stepping both, they should stay in sync
    const moreA = Array.from({ length: 5 }, () => rngA());
    const moreB = Array.from({ length: 5 }, () => rngB());

    expect(moreA).toEqual(moreB);
  });
});
