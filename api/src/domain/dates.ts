/** Calendar dates as `YYYY-MM-DD` strings, with day arithmetic that needs no Date object. */
export type IsoDate = string;

// Howard Hinnant's civil-calendar algorithms: 400-year eras of 146,097 days, with years
// starting in March so the leap day falls at the end.

/** Days since 1970-01-01 (proleptic Gregorian). */
export function toEpochDay(date: IsoDate): number {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146_097 + dayOfEra - 719_468;
}

export function fromEpochDay(epochDay: number): IsoDate {
  const z = epochDay + 719_468;
  const era = Math.floor(z / 146_097);
  const dayOfEra = z - era * 146_097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36_524) -
      Math.floor(dayOfEra / 146_096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
  const month = shiftedMonth < 10 ? shiftedMonth + 3 : shiftedMonth - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromEpochDay(toEpochDay(date) + days);
}

/** The calendar date at `instant` (epoch ms) in an IANA time zone (decision X3). */
export function todayIn(_instant: number, _timeZone: string): IsoDate {
  throw new Error('Not implemented');
}

/** Whether `name` is an IANA time zone this runtime knows. */
export function isTimeZone(_name: string): boolean {
  throw new Error('Not implemented');
}
