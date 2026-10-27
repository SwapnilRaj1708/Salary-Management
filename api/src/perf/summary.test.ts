import { describe, expect, it } from 'vitest';
import { readServerTiming, summarize, tableRow } from './summary.ts';

describe('readServerTiming', () => {
  it('reads the app time and the cold marker', () => {
    expect(readServerTiming('app;dur=12, cold;desc="first request on this instance"')).toEqual({
      serverMs: 12,
      cold: true,
    });
    expect(readServerTiming('app;dur=3')).toEqual({ serverMs: 3, cold: false });
  });

  it('copes with a missing header, such as from the static web app', () => {
    expect(readServerTiming(null)).toEqual({ cold: false });
  });
});

describe('summarize', () => {
  it('gives the median, p95 and max of the total and server times', () => {
    const timings = Array.from({ length: 20 }, (_, i) => ({
      ms: (i + 1) * 10,
      serverMs: i + 1,
      cold: false,
    }));

    expect(summarize(timings)).toEqual({
      n: 20,
      p50: 105,
      p95: 191,
      max: 200,
      serverP50: 11,
      serverP95: 19,
    });
  });

  it('leaves server figures empty when no response had them', () => {
    expect(summarize([{ ms: 40, serverMs: undefined, cold: false }])).toMatchObject({
      p50: 40,
      serverP50: undefined,
    });
  });
});

describe('tableRow', () => {
  it('writes one Markdown table row', () => {
    const row = tableRow('List', {
      n: 30,
      p50: 80,
      p95: 120,
      max: 150,
      serverP50: 20,
      serverP95: undefined,
    });

    expect(row).toBe('| List | 30 | 80 ms | 120 ms | 150 ms | 20 ms | – |');
  });
});
