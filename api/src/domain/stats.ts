/**
 * The value at fraction `p` (0–1) of an ascending list, with Excel's PERCENTILE.INC
 * semantics (docs/architecture.md §6). Not implemented yet.
 */
export function percentile(_sorted: readonly number[], _p: number): number {
  throw new Error('Not implemented');
}

export type Bin = { from: number; to: number; count: number };

/** Equal-width bins with round edges. Not implemented yet. */
export function histogram(_values: readonly number[], _targetBins: number): Bin[] {
  throw new Error('Not implemented');
}
