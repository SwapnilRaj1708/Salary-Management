/**
 * Countries, currencies and the exchange-rate snapshot: the one place they live
 * (docs/architecture.md §5). The API copies them into the database at startup, the web app
 * formats money with them, and the seed uses them.
 *
 * Currencies:
 * - `minorUnit`: ISO 4217 decimal places. Amounts are stored as integers in this unit.
 * - `locale`: how amounts are written. `en-US` gives unambiguous symbols in a
 *   multi-currency table (`A$`, `CA$`, `SGD`); INR uses `en-IN` for lakh/crore grouping.
 * - `unitsPerUsd`: a static approximation of the rate on `FX_AS_OF`, quoted the usual way
 *   (INR 88 per USD). Live rates are out of scope (docs/clarifications.md, question 1).
 */
export const CURRENCIES = {
  AUD: { minorUnit: 2, locale: 'en-US', unitsPerUsd: 1.52 },
  BRL: { minorUnit: 2, locale: 'en-US', unitsPerUsd: 5.4 },
  CAD: { minorUnit: 2, locale: 'en-US', unitsPerUsd: 1.37 },
  EUR: { minorUnit: 2, locale: 'en-US', unitsPerUsd: 0.92 },
  GBP: { minorUnit: 2, locale: 'en-US', unitsPerUsd: 0.79 },
  INR: { minorUnit: 2, locale: 'en-IN', unitsPerUsd: 88 },
  JPY: { minorUnit: 0, locale: 'en-US', unitsPerUsd: 150 },
  KWD: { minorUnit: 3, locale: 'en-US', unitsPerUsd: 0.307 },
  SGD: { minorUnit: 2, locale: 'en-US', unitsPerUsd: 1.34 },
  USD: { minorUnit: 2, locale: 'en-US', unitsPerUsd: 1 },
} as const satisfies Record<string, { minorUnit: MinorUnit; locale: string; unitsPerUsd: number }>;

/** The date the `unitsPerUsd` snapshot describes. Every USD figure is labelled with it. */
export const FX_AS_OF = '2026-10-01';

export type MinorUnit = 0 | 2 | 3;
export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

/** The ten countries ACME employs people in, keyed by ISO 3166-1 alpha-2 code. */
export const COUNTRIES = {
  AU: { name: 'Australia', currency: 'AUD' },
  BR: { name: 'Brazil', currency: 'BRL' },
  CA: { name: 'Canada', currency: 'CAD' },
  DE: { name: 'Germany', currency: 'EUR' },
  GB: { name: 'United Kingdom', currency: 'GBP' },
  IN: { name: 'India', currency: 'INR' },
  JP: { name: 'Japan', currency: 'JPY' },
  KW: { name: 'Kuwait', currency: 'KWD' },
  SG: { name: 'Singapore', currency: 'SGD' },
  US: { name: 'United States', currency: 'USD' },
} as const satisfies Record<string, { name: string; currency: CurrencyCode }>;

export type CountryCode = keyof typeof COUNTRIES;
export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];
