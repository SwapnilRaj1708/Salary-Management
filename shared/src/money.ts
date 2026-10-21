import type { MinorUnit } from './reference.ts';

export type ParseMoneyError =
  | 'EMPTY'
  | 'NOT_A_NUMBER'
  | 'NOT_POSITIVE'
  | 'TOO_MANY_DECIMALS'
  | 'TOO_LARGE';

export type ParseMoneyResult =
  | { ok: true; amountMinor: number }
  | { ok: false; error: ParseMoneyError };

// Digits, optionally grouped the Western way (1,234,567) or the Indian way (12,34,567),
// then an optional fraction. A leading minus is matched so negatives get their own error.
const AMOUNT = /^(-?)(\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.(\d+))?$/;

/**
 * Reads a typed amount such as "25,00,000.50" into integer minor units. It works on the
 * string, never with float maths, so "1.15" is exactly 115 cents.
 */
export function parseMoney(input: string, minorUnit: MinorUnit): ParseMoneyResult {
  const text = input.trim();
  if (text === '') return { ok: false, error: 'EMPTY' };

  const match = AMOUNT.exec(text);
  if (!match) return { ok: false, error: 'NOT_A_NUMBER' };
  const [, sign = '', whole = '', fraction = ''] = match;
  if (fraction.length > minorUnit) return { ok: false, error: 'TOO_MANY_DECIMALS' };

  const digits = (whole.replaceAll(',', '') + fraction.padEnd(minorUnit, '0')).replace(/^0+/, '');
  if (sign === '-' || digits === '') return { ok: false, error: 'NOT_POSITIVE' };

  const amountMinor = Number(digits);
  if (!Number.isSafeInteger(amountMinor)) return { ok: false, error: 'TOO_LARGE' };
  return { ok: true, amountMinor };
}
