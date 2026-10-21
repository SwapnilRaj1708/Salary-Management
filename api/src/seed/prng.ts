/** A source of uniform random numbers in [0, 1); injected so the seed is reproducible. */
export type Rng = () => number;

/** mulberry32: a tiny 32-bit PRNG. The same seed gives the same sequence forever (D11). */
export function mulberry32(_seed: number): Rng {
  throw new Error('Not implemented');
}
