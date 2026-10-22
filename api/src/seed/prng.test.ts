import { describe, expect, it } from 'vitest';
import { mulberry32 } from './prng.ts';

const take = (rng: () => number, n: number) => Array.from({ length: n }, () => rng());

describe('mulberry32', () => {
  it('matches the reference implementation for seed 1', () => {
    // Values from the published reference algorithm (bryc's PRNG collection).
    expect(take(mulberry32(1), 3)).toEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
    ]);
  });

  it('gives the same sequence for the same seed', () => {
    expect(take(mulberry32(42), 100)).toEqual(take(mulberry32(42), 100));
  });

  it('gives a different sequence for a different seed', () => {
    expect(take(mulberry32(42), 5)).not.toEqual(take(mulberry32(43), 5));
  });

  it('stays within [0, 1)', () => {
    for (const value of take(mulberry32(7), 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
