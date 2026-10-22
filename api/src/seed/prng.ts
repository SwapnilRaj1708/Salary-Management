/** A source of uniform random numbers in [0, 1); injected so the seed is reproducible. */
export type Rng = () => number;

/** mulberry32: a tiny 32-bit PRNG. The same seed gives the same sequence forever (D11). */
export function mulberry32(seed: number): Rng {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
