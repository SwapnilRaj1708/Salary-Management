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

export function parseMoney(_input: string, _minorUnit: MinorUnit): ParseMoneyResult {
  throw new Error('Not implemented');
}
