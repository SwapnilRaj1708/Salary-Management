/**
 * The value at fraction `p` (0–1) of an ascending list, with Excel's PERCENTILE.INC
 * semantics: linear interpolation at rank (n − 1)·p (docs/architecture.md §6).
 */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) throw new Error('percentile of an empty list');
  const rank = (sorted.length - 1) * p;
  const below = Math.floor(rank);
  const lower = sorted[below] as number;
  const upper = sorted[Math.min(below + 1, sorted.length - 1)] as number;
  return lower + (rank - below) * (upper - lower);
}

export type Bin = { from: number; to: number; count: number };

/**
 * A round bin width for `range` split into about `targetBins`: 1, 2 or 5 times a power of
 * ten, picked by the same thresholds as d3's tick steps (√50, √10, √2), and at least 1.
 */
function niceWidth(range: number, targetBins: number): number {
  const raw = range / targetBins;
  if (raw <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const residual = raw / magnitude;
  const nice =
    residual >= Math.sqrt(50)
      ? 10
      : residual >= Math.sqrt(10)
        ? 5
        : residual >= Math.sqrt(2)
          ? 2
          : 1;
  return nice * magnitude;
}

/**
 * Equal-width bins with round edges. Each bin includes its lower edge and excludes its
 * upper one; empty bins between the first and last are kept.
 */
export function histogram(values: readonly number[], targetBins: number): Bin[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = niceWidth(max - min, targetBins);
  const start = Math.floor(min / width) * width;
  const bins: Bin[] = [];
  for (let from = start; from <= max; from += width)
    bins.push({ from, to: from + width, count: 0 });
  for (const value of values) (bins[Math.floor((value - start) / width)] as Bin).count += 1;
  return bins;
}
