import { describe, expect, it } from 'vitest';
import { addDays, fromEpochDay, isTimeZone, todayIn, toEpochDay } from './dates.ts';

const DAY_MS = 86_400_000;

describe('epoch days', () => {
  it.each(['1970-01-01', '2000-02-29', '2024-02-29', '2026-10-01', '2100-03-01', '1969-12-31'])(
    'agree with Date.UTC for %s',
    (date) => {
      const [y, m, d] = date.split('-').map(Number) as [number, number, number];

      expect(toEpochDay(date)).toBe(Date.UTC(y, m - 1, d) / DAY_MS);
    },
  );

  it('turns every day of 2023-2025 back into the same date string', () => {
    for (let day = toEpochDay('2023-01-01'); day <= toEpochDay('2025-12-31'); day += 1) {
      expect(toEpochDay(fromEpochDay(day))).toBe(day);
    }
  });

  it('adds days across a month end and a leap day', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01');
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
  });
});

describe('today', () => {
  const instant = Date.UTC(2026, 9, 27, 20, 0); // 2026-10-27 20:00 UTC

  it('is the calendar date in the configured time zone, not in UTC', () => {
    expect(todayIn(instant, 'Asia/Kolkata')).toBe('2026-10-28');
    expect(todayIn(instant, 'America/New_York')).toBe('2026-10-27');
    expect(todayIn(instant, 'UTC')).toBe('2026-10-27');
  });

  it('recognises IANA time zone names and rejects anything else', () => {
    expect(isTimeZone('Asia/Kolkata')).toBe(true);
    expect(isTimeZone('Mars/Olympus_Mons')).toBe(false);
    expect(isTimeZone('')).toBe(false);
  });
});
