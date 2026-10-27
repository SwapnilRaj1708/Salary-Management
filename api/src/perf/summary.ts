import { percentile } from '../domain/stats.ts';

export type Timing = { ms: number; serverMs: number | undefined; cold: boolean };

export type Summary = {
  n: number;
  p50: number;
  p95: number;
  max: number;
  serverP50: number | undefined;
  serverP95: number | undefined;
};

/** Reads `app;dur=12, cold;desc="…"` (our Server-Timing) into the app time and cold flag. */
export function readServerTiming(header: string | null): { serverMs?: number; cold: boolean } {
  if (!header) return { cold: false };
  const dur = /(?:^|,\s*)app;dur=(\d+(?:\.\d+)?)/.exec(header)?.[1];
  return {
    ...(dur === undefined ? {} : { serverMs: Number(dur) }),
    cold: /(?:^|,\s*)cold(?:;|,|$)/.test(header),
  };
}

/** Percentiles of a series of timings, rounded to whole milliseconds. */
export function summarize(timings: readonly Timing[]): Summary {
  const sorted = (values: number[]) => [...values].sort((a, b) => a - b);
  const total = sorted(timings.map((t) => t.ms));
  const server = sorted(timings.flatMap((t) => (t.serverMs === undefined ? [] : [t.serverMs])));
  const at = (values: number[], p: number) =>
    values.length === 0 ? undefined : Math.round(percentile(values, p));
  return {
    n: total.length,
    p50: at(total, 0.5) ?? 0,
    p95: at(total, 0.95) ?? 0,
    max: Math.round(total.at(-1) ?? 0),
    serverP50: at(server, 0.5),
    serverP95: at(server, 0.95),
  };
}

/** A Markdown table row: name, count, total p50/p95/max, then server p50/p95. */
export function tableRow(name: string, s: Summary): string {
  const ms = (value: number | undefined) => (value === undefined ? '–' : `${value} ms`);
  return `| ${name} | ${s.n} | ${ms(s.p50)} | ${ms(s.p95)} | ${ms(s.max)} | ${ms(s.serverP50)} | ${ms(s.serverP95)} |`;
}
