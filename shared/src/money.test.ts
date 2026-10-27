import { describe, expect, it } from 'vitest';
import { amountAsDecimal, formatMoney, parseMoney } from './money.ts';

describe('parseMoney', () => {
  it.each([
    ['1200', 2, 120_000],
    ['1200.5', 2, 120_050],
    ['1200.05', 2, 120_005],
    ['1.234', 3, 1_234],
    ['8000000', 0, 8_000_000],
  ] as const)('reads %j with %i decimal places as %i minor units', (input, minorUnit, minor) => {
    expect(parseMoney(input, minorUnit)).toEqual({ ok: true, amountMinor: minor });
  });

  it.each([
    ['1.15', 2, 115],
    ['1.005', 3, 1_005],
    ['0.29', 2, 29],
  ] as const)(
    'reads %j exactly, where float maths would be off by one',
    (input, minorUnit, minor) => {
      expect(parseMoney(input, minorUnit)).toEqual({ ok: true, amountMinor: minor });
    },
  );

  it.each([
    ['25,00,000.50', 250_000_050],
    ['2,500,000.50', 250_000_050],
    ['1,000', 100_000],
  ])('accepts Indian and Western digit grouping in %j', (input, minor) => {
    expect(parseMoney(input, 2)).toEqual({ ok: true, amountMinor: minor });
  });

  it('ignores spaces around the amount', () => {
    expect(parseMoney('  1200.50 ', 2)).toEqual({ ok: true, amountMinor: 120_050 });
  });

  it.each([
    ['10.123', 2],
    ['8000000.5', 0],
    ['8000000.00', 0],
    ['1.2345', 3],
  ] as const)('rejects %j, which has more than %i decimal places', (input, minorUnit) => {
    expect(parseMoney(input, minorUnit)).toEqual({ ok: false, error: 'TOO_MANY_DECIMALS' });
  });

  it.each(['0', '0.00', '-5', '-1,000.00'])(
    'rejects %j, which is not a positive amount',
    (input) => {
      expect(parseMoney(input, 2)).toEqual({ ok: false, error: 'NOT_POSITIVE' });
    },
  );

  it.each(['', '   '])('reports %j as empty', (input) => {
    expect(parseMoney(input, 2)).toEqual({ ok: false, error: 'EMPTY' });
  });

  it.each([
    'abc',
    '12abc',
    '1e5',
    '+5',
    '.5',
    '12.',
    '1.2.3',
    '1,00',
    '12,34',
    '1,0000',
    'Infinity',
  ])('rejects %j, which is not a plain decimal amount', (input) => {
    expect(parseMoney(input, 2)).toEqual({ ok: false, error: 'NOT_A_NUMBER' });
  });

  it('rejects an amount too large to hold exactly as a JavaScript number', () => {
    expect(parseMoney('90071992547409.92', 2)).toEqual({ ok: false, error: 'TOO_LARGE' });
  });

  it('accepts the largest amount a JavaScript number holds exactly', () => {
    expect(parseMoney('90071992547409.91', 2)).toEqual({
      ok: true,
      amountMinor: Number.MAX_SAFE_INTEGER,
    });
  });
});

describe('formatMoney', () => {
  it('writes INR with Indian digit grouping', () => {
    expect(formatMoney({ amountMinor: 250_000_050, currency: 'INR' })).toBe('₹25,00,000.50');
  });

  it('writes JPY without decimals', () => {
    expect(formatMoney({ amountMinor: 8_000_000, currency: 'JPY' })).toBe('¥8,000,000');
  });

  it('writes KWD with three decimals', () => {
    expect(formatMoney({ amountMinor: 1_234_567, currency: 'KWD' })).toBe('KWD\u00a01,234.567');
  });

  it('always shows the currency decimals, even when they are zero', () => {
    expect(formatMoney({ amountMinor: 120_000, currency: 'USD' })).toBe('$1,200.00');
  });

  it('uses symbols that tell dollar currencies apart', () => {
    expect(formatMoney({ amountMinor: 100, currency: 'AUD' })).toBe('A$1.00');
    expect(formatMoney({ amountMinor: 100, currency: 'CAD' })).toBe('CA$1.00');
    expect(formatMoney({ amountMinor: 100, currency: 'USD' })).toBe('$1.00');
  });

  it('writes the largest exact amount without float rounding', () => {
    expect(formatMoney({ amountMinor: Number.MAX_SAFE_INTEGER, currency: 'USD' })).toBe(
      '$90,071,992,547,409.91',
    );
  });

  it('writes a negative amount, such as a pay cut, with a minus sign', () => {
    expect(formatMoney({ amountMinor: -50_000, currency: 'USD' })).toBe('-$500.00');
  });

  it('refuses a fractional minor amount, which would hide a rounding bug', () => {
    expect(() => formatMoney({ amountMinor: 100.5, currency: 'USD' })).toThrow(RangeError);
  });

  it('writes a short form for chart labels when asked', () => {
    expect(formatMoney({ amountMinor: 12_000_000, currency: 'USD' }, { compact: true })).toBe(
      '$120K',
    );
    expect(formatMoney({ amountMinor: 9_500_000, currency: 'JPY' }, { compact: true })).toBe(
      '¥9.5M',
    );
    expect(formatMoney({ amountMinor: 250_000_000, currency: 'INR' }, { compact: true })).toBe(
      '₹25L',
    );
  });
});

describe('amountAsDecimal', () => {
  it('writes an amount in major units with the currency decimals, without float maths', () => {
    expect(amountAsDecimal({ amountMinor: 9_000_050, currency: 'USD' })).toBe('90000.50');
    expect(amountAsDecimal({ amountMinor: 9_000_000, currency: 'JPY' })).toBe('9000000');
    expect(amountAsDecimal({ amountMinor: 16_545_799, currency: 'KWD' })).toBe('16545.799');
    expect(amountAsDecimal({ amountMinor: 5, currency: 'USD' })).toBe('0.05');
    expect(amountAsDecimal({ amountMinor: 900_719_925_474_099, currency: 'USD' })).toBe(
      '9007199254740.99',
    );
  });
});
