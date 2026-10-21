import { describe, expect, it } from 'vitest';
import { CURRENCIES, CURRENCY_CODES } from './reference.ts';

describe('CURRENCIES', () => {
  it.each(CURRENCY_CODES)("gives %s the decimal places that Intl's currency data has", (code) => {
    const intl = new Intl.NumberFormat('en-US', { style: 'currency', currency: code });

    expect(intl.resolvedOptions().maximumFractionDigits).toBe(CURRENCIES[code].minorUnit);
  });
});
