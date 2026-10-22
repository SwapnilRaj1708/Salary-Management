import { describe, expect, it } from 'vitest';
import { COUNTRIES, COUNTRY_CODES, CURRENCIES, CURRENCY_CODES, FX_AS_OF } from './reference.ts';

describe('CURRENCIES', () => {
  it.each(CURRENCY_CODES)("gives %s the decimal places that Intl's currency data has", (code) => {
    const intl = new Intl.NumberFormat('en-US', { style: 'currency', currency: code });

    expect(intl.resolvedOptions().maximumFractionDigits).toBe(CURRENCIES[code].minorUnit);
  });
});

describe('COUNTRIES', () => {
  it('uses every currency, so no currency is unreachable', () => {
    const used = new Set(COUNTRY_CODES.map((code) => COUNTRIES[code].currency));

    expect([...used].sort()).toEqual([...CURRENCY_CODES].sort());
  });

  it('has a positive USD rate for every currency, with USD itself at 1', () => {
    for (const code of CURRENCY_CODES) expect(CURRENCIES[code].unitsPerUsd).toBeGreaterThan(0);
    expect(CURRENCIES.USD.unitsPerUsd).toBe(1);
  });

  it('dates the rate snapshot as a real calendar date', () => {
    expect(FX_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${FX_AS_OF}T00:00:00Z`).toISOString().slice(0, 10)).toBe(FX_AS_OF);
  });
});
