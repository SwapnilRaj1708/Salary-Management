import { describe, expect, it } from 'vitest';
import { histogram, percentile } from './stats.ts';

// Expected values were checked with Excel's PERCENTILE.INC.
describe('percentile', () => {
  it('interpolates between ranks like PERCENTILE.INC: [1, 2, 10] at 0.9 is 8.4', () => {
    expect(percentile([1, 2, 10], 0.9)).toBeCloseTo(8.4, 10);
  });

  it('takes the midpoint for the median of an even count', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });

  it('returns the middle value for the median of an odd count', () => {
    expect(percentile([3, 7, 100], 0.5)).toBe(7);
  });

  it('returns the smallest and largest values at 0 and 1', () => {
    expect(percentile([5, 8, 13], 0)).toBe(5);
    expect(percentile([5, 8, 13], 1)).toBe(13);
  });

  it('returns the only value of a one-element list', () => {
    expect(percentile([42], 0.25)).toBe(42);
  });

  it('expects sorted input and rejects an empty list', () => {
    expect(() => percentile([], 0.5)).toThrow();
  });
});

describe('histogram', () => {
  it('uses a round bin width (1, 2 or 5 times a power of ten) for about ten bins', () => {
    const bins = histogram([0, 37, 95], 10);

    expect(bins.map((bin) => bin.to - bin.from)).toEqual(Array(10).fill(10));
    expect(bins[0]).toEqual({ from: 0, to: 10, count: 1 });
  });

  it('keeps empty bins, so gaps in pay show as gaps', () => {
    const bins = histogram([100, 900], 10);

    expect(bins.map((bin) => bin.count)).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 1]);
    expect(bins.at(0)?.from).toBe(100);
    expect(bins.at(-1)?.to).toBe(1000);
  });

  it('puts a value on an edge in the bin that starts there', () => {
    const bins = histogram([0, 10, 20, 100], 10);

    expect(bins.find((bin) => bin.from === 10)?.count).toBe(1);
    expect(bins.at(-1)).toEqual({ from: 100, to: 110, count: 1 });
  });

  it('starts the first bin on a multiple of the width below the smallest value', () => {
    const bins = histogram([4_250_000, 5_100_000, 9_870_000], 10);

    expect(bins[0]?.from).toBe(4_000_000);
    expect(bins[0]?.to).toBe(4_500_000);
  });

  it('counts every value exactly once', () => {
    const values = Array.from({ length: 1000 }, (_, i) => 3_000_000 + ((i * 7919) % 5_000_000));

    const bins = histogram(values, 10);

    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(1000);
    expect(bins.length).toBeGreaterThanOrEqual(8);
    expect(bins.length).toBeLessThanOrEqual(12);
  });

  it('gives one bin when every value is the same', () => {
    expect(histogram([7, 7, 7], 10)).toEqual([{ from: 7, to: 8, count: 3 }]);
  });

  it('gives no bins for no values', () => {
    expect(histogram([], 10)).toEqual([]);
  });
});
