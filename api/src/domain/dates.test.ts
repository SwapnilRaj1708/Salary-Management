import { describe, expect, it } from 'vitest';
import { addDays, fromEpochDay, toEpochDay } from './dates.ts';

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
