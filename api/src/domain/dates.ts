/** Calendar dates as `YYYY-MM-DD` strings, with day arithmetic that needs no Date object. */
export type IsoDate = string;

/** Days since 1970-01-01 (proleptic Gregorian). */
export function toEpochDay(_date: IsoDate): number {
  throw new Error('Not implemented');
}

export function fromEpochDay(_day: number): IsoDate {
  throw new Error('Not implemented');
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromEpochDay(toEpochDay(date) + days);
}
