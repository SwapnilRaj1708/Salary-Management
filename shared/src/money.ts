import { CURRENCIES, type CurrencyCode, type MinorUnit } from './reference.ts';

export type Money = { amountMinor: number; currency: CurrencyCode };

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

/** The amount in major units as a plain decimal, such as "90000.50". Not implemented yet. */
export function amountAsDecimal(_money: Money): string {
  throw new Error('Not implemented');
}

/**
 * Writes an amount for display, with the decimals from our currency table. Intl gets an
 * exact decimal string, never `amountMinor / 100`: dividing loses cents on large amounts.
 * `compact` gives short chart labels such as "$120K" or "₹25L".
 */
export function formatMoney(
  { amountMinor, currency }: Money,
  { compact = false }: { compact?: boolean } = {},
): string {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError(`amountMinor must be a safe integer, got ${amountMinor}`);
  }
  const { minorUnit, locale } = CURRENCIES[currency];
  const digits = Math.abs(amountMinor)
    .toString()
    .padStart(minorUnit + 1, '0');
  const whole = digits.slice(0, digits.length - minorUnit);
  const fraction = digits.slice(digits.length - minorUnit);
  const decimal = `${amountMinor < 0 ? '-' : ''}${whole}${minorUnit > 0 ? `.${fraction}` : ''}`;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...(compact
      ? { notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 }
      : { minimumFractionDigits: minorUnit, maximumFractionDigits: minorUnit }),
  }).format(decimal as Intl.StringNumericLiteral);
}
