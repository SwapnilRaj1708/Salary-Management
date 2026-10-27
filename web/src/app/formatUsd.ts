import { formatMoney } from '@salary/shared';

/**
 * A USD figure from the API (dollars, already rounded to cents) written with formatMoney.
 * `Math.round` only turns cents that are already whole into an integer.
 */
export const formatUsd = (dollars: number, options: { compact?: boolean } = {}) =>
  formatMoney({ amountMinor: Math.round(dollars * 100), currency: 'USD' }, options);
