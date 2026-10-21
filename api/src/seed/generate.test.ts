import { COUNTRIES, COUNTRY_CODES, CURRENCIES } from '@salary/shared';
import { describe, expect, it } from 'vitest';
import { DEPARTMENTS, JOB_TITLES } from '../db/reference.ts';
import { toEpochDay } from '../domain/dates.ts';
import { COUNTRY_PROFILES, DEPARTMENT_PROFILES, HEADCOUNT, SEED, SEED_AS_OF } from './catalogue.ts';
import { generateOrg, type SeedEmployee } from './generate.ts';
import { mulberry32 } from './prng.ts';

const generate = (seed = SEED, count = HEADCOUNT) =>
  generateOrg({ rng: mulberry32(seed), count, asOf: SEED_AS_OF });

// Generated once on first use and only read, so the 10,000-row checks stay fast.
let cached: SeedEmployee[] | undefined;
const fullOrg = () => {
  cached ??= generate();
  return cached;
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

describe('generateOrg', () => {
  it('generates the same organisation for the same seed', () => {
    expect(generate(SEED, 500)).toEqual(generate(SEED, 500));
  });

  it('generates a different organisation for a different seed', () => {
    expect(generate(1, 50)).not.toEqual(generate(2, 50));
  });

  it('generates 10,000 employees with each country at its planned headcount', () => {
    expect(fullOrg()).toHaveLength(10_000);
    for (const code of COUNTRY_CODES) {
      expect(fullOrg().filter((e) => e.countryCode === code)).toHaveLength(
        COUNTRY_PROFILES[code].headcount,
      );
    }
  });

  it('mixes countries through the list instead of grouping them by id', () => {
    const firstHundredCountries = new Set(
      fullOrg()
        .slice(0, 100)
        .map((e) => e.countryCode),
    );

    expect(firstHundredCountries.size).toBeGreaterThan(5);
  });

  it('gives every employee a unique, lower-case ASCII email at the company domain', () => {
    const emails = fullOrg().map((e) => e.email);

    expect(new Set(emails).size).toBe(emails.length);
    for (const email of emails) expect(email).toMatch(/^[a-z]+\.[a-z]+\d*@acme\.example$/);
  });

  it('uses only the fixed lists, with each title taken from its own department', () => {
    for (const e of fullOrg()) {
      expect(DEPARTMENTS).toContain(e.department);
      expect(JOB_TITLES).toContain(e.jobTitle);
      expect(Object.keys(DEPARTMENT_PROFILES[e.department].titles)).toContain(e.jobTitle);
    }
  });

  it('starts every history with a hire row on the hire date', () => {
    for (const e of fullOrg()) {
      expect(e.history[0]).toMatchObject({ reason: 'hire', effectiveDate: e.hireDate });
      expect(e.history.slice(1).every((change) => change.reason !== 'hire')).toBe(true);
    }
  });

  it('keeps each history in date order, with every amount positive and different from the last', () => {
    for (const e of fullOrg()) {
      e.history.forEach((change, i) => {
        expect(Number.isSafeInteger(change.amountMinor)).toBe(true);
        expect(change.amountMinor).toBeGreaterThan(0);
        const previous = e.history[i - 1];
        if (previous) {
          expect(change.effectiveDate > previous.effectiveDate).toBe(true);
          expect(change.amountMinor).not.toBe(previous.amountMinor);
        }
      });
    }
  });

  it('caches the latest history amount as the current salary', () => {
    for (const e of fullOrg()) expect(e.salaryMinor).toBe(e.history.at(-1)?.amountMinor);
  });

  it('dates nothing after the as-of date, and leavers leave on or after their last change', () => {
    for (const e of fullOrg()) {
      const last = e.history.at(-1) as SeedEmployee['history'][number];
      expect(last.effectiveDate <= SEED_AS_OF).toBe(true);
      if (e.leftOn !== null) {
        expect(e.leftOn >= last.effectiveDate).toBe(true);
        expect(e.leftOn <= SEED_AS_OF).toBe(true);
      }
    }
  });

  it('has some leavers, but keeps most people employed', () => {
    const leavers = fullOrg().filter((e) => e.leftOn !== null).length;

    expect(leavers).toBeGreaterThan(300);
    expect(leavers).toBeLessThan(1500);
  });

  it('records a few salary changes per employee on average', () => {
    const rows = fullOrg().reduce((sum, e) => sum + e.history.length, 0);

    expect(rows / fullOrg().length).toBeGreaterThan(1.5);
    expect(rows / fullOrg().length).toBeLessThan(5);
  });

  it('writes amounts in whole local units, rounded to the country step', () => {
    for (const e of fullOrg()) {
      const { minorUnit } = CURRENCIES[COUNTRIES[e.countryCode].currency];
      const step = COUNTRY_PROFILES[e.countryCode].roundTo * 10 ** minorUnit;
      for (const change of e.history) expect(change.amountMinor % step).toBe(0);
    }
  });

  it('pays a Staff Engineer more than a Junior Software Engineer in the same country', () => {
    const pay = (title: string) =>
      median(
        fullOrg()
          .filter((e) => e.countryCode === 'US' && e.jobTitle === title)
          .map((e) => e.salaryMinor),
      );

    expect(pay('Staff Engineer')).toBeGreaterThan(pay('Junior Software Engineer'));
  });

  it('hires people across the company history, not all at once', () => {
    const hireYears = new Set(fullOrg().map((e) => e.hireDate.slice(0, 4)));

    expect(hireYears.size).toBeGreaterThanOrEqual(10);
    expect(Math.min(...fullOrg().map((e) => toEpochDay(e.hireDate)))).toBeGreaterThanOrEqual(
      toEpochDay('2012-01-02'),
    );
  });
});
