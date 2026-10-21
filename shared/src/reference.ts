/**
 * The currencies the app supports: the one place their decimal places live
 * (docs/architecture.md §5). Countries and the USD exchange-rate snapshot join this table in
 * slice S4.
 *
 * - `minorUnit`: ISO 4217 decimal places. Amounts are stored as integers in this unit.
 * - `locale`: how amounts are written. `en-US` gives unambiguous symbols in a
 *   multi-currency table (`A$`, `CA$`, `SGD`); INR uses `en-IN` for lakh/crore grouping.
 */
export const CURRENCIES = {
  AUD: { minorUnit: 2, locale: 'en-US' },
  BRL: { minorUnit: 2, locale: 'en-US' },
  CAD: { minorUnit: 2, locale: 'en-US' },
  EUR: { minorUnit: 2, locale: 'en-US' },
  GBP: { minorUnit: 2, locale: 'en-US' },
  INR: { minorUnit: 2, locale: 'en-IN' },
  JPY: { minorUnit: 0, locale: 'en-US' },
  KWD: { minorUnit: 3, locale: 'en-US' },
  SGD: { minorUnit: 2, locale: 'en-US' },
  USD: { minorUnit: 2, locale: 'en-US' },
} as const satisfies Record<string, { minorUnit: MinorUnit; locale: string }>;

export type MinorUnit = 0 | 2 | 3;
export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];
