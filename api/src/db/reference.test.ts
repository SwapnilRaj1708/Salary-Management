import { COUNTRIES, COUNTRY_CODES, CURRENCIES, CURRENCY_CODES, FX_AS_OF } from '@salary/shared';
import { describe, expect, it } from 'vitest';
import { migratedDb } from '../test/db.ts';
import { DEPARTMENTS, JOB_TITLES, syncReferenceData } from './reference.ts';

describe('syncReferenceData', () => {
  it('copies every currency with its decimal places and USD rate', async () => {
    const db = await migratedDb();

    await syncReferenceData(db);

    const { rows } = await db.execute(
      'SELECT code, minor_unit, units_per_usd, rate_as_of FROM currencies ORDER BY code',
    );
    expect(rows.map((row) => ({ ...row }))).toEqual(
      [...CURRENCY_CODES].sort().map((code) => ({
        code,
        minor_unit: CURRENCIES[code].minorUnit,
        units_per_usd: CURRENCIES[code].unitsPerUsd,
        rate_as_of: FX_AS_OF,
      })),
    );
  });

  it('copies every country with its currency', async () => {
    const db = await migratedDb();

    await syncReferenceData(db);

    const { rows } = await db.execute(
      'SELECT code, name, currency_code FROM countries ORDER BY code',
    );
    expect(rows.map((row) => ({ ...row }))).toEqual(
      [...COUNTRY_CODES].sort().map((code) => ({
        code,
        name: COUNTRIES[code].name,
        currency_code: COUNTRIES[code].currency,
      })),
    );
  });

  it('adds every department and job title', async () => {
    const db = await migratedDb();

    await syncReferenceData(db);

    const departments = await db.execute('SELECT name FROM departments ORDER BY id');
    const titles = await db.execute('SELECT name FROM job_titles ORDER BY id');
    expect(departments.rows.map((row) => row.name)).toEqual([...DEPARTMENTS]);
    expect(titles.rows.map((row) => row.name)).toEqual([...JOB_TITLES]);
  });

  it('changes nothing when it runs again, so ids stay stable', async () => {
    const db = await migratedDb();
    await syncReferenceData(db);
    const before = await db.execute('SELECT id, name FROM job_titles ORDER BY id');

    await syncReferenceData(db);

    const after = await db.execute('SELECT id, name FROM job_titles ORDER BY id');
    expect(after.rows.map((row) => ({ ...row }))).toEqual(before.rows.map((row) => ({ ...row })));
    const counts = await db.execute(
      'SELECT (SELECT count(*) FROM currencies) AS currencies, (SELECT count(*) FROM countries) AS countries',
    );
    expect({ ...counts.rows[0] }).toEqual({
      currencies: CURRENCY_CODES.length,
      countries: COUNTRY_CODES.length,
    });
  });

  it('writes no rows when nothing changed, so each cold start costs only reads', async () => {
    const db = await migratedDb();
    await syncReferenceData(db);
    const changesSoFar = async () =>
      Number((await db.execute('SELECT total_changes() AS n')).rows[0]?.n);
    const before = await changesSoFar();

    await syncReferenceData(db);

    expect(await changesSoFar()).toBe(before);
  });

  it('updates a rate that changed in the code since the last run', async () => {
    const db = await migratedDb();
    await syncReferenceData(db);
    await db.execute(
      "UPDATE currencies SET units_per_usd = 80, rate_as_of = '2025-01-01' WHERE code = 'INR'",
    );

    await syncReferenceData(db);

    const { rows } = await db.execute(
      "SELECT units_per_usd, rate_as_of FROM currencies WHERE code = 'INR'",
    );
    expect({ ...rows[0] }).toEqual({
      units_per_usd: CURRENCIES.INR.unitsPerUsd,
      rate_as_of: FX_AS_OF,
    });
  });
});
