import { describe, expect, it } from 'vitest';
import {
  aCountry,
  aCurrency,
  anEmployee,
  aSalaryChange,
  insertRow,
  withUsReferenceRows,
} from '../test/builders.ts';
import { migratedDb } from '../test/db.ts';

async function dbWithReferenceRows() {
  const db = await migratedDb();
  await withUsReferenceRows(db);
  return db;
}

describe('schema constraints', () => {
  it('rejects a malformed hire date, which a plain date() comparison would let through', async () => {
    const db = await dbWithReferenceRows();

    await expect(insertRow(db, 'employees', anEmployee({ hire_date: 'banana' }))).rejects.toThrow(
      /CHECK constraint failed/,
    );
  });

  it('rejects a salary that is not a whole number of minor units', async () => {
    const db = await dbWithReferenceRows();

    await expect(
      insertRow(db, 'employees', anEmployee({ current_salary_minor: 100.5 })),
    ).rejects.toThrow();
  });

  it('rejects a salary of zero', async () => {
    const db = await dbWithReferenceRows();

    await expect(
      insertRow(db, 'employees', anEmployee({ current_salary_minor: 0 })),
    ).rejects.toThrow(/CHECK constraint failed/);
  });

  it('rejects a leaver without a leaving date, and a leaving date without the status', async () => {
    const db = await dbWithReferenceRows();

    await expect(insertRow(db, 'employees', anEmployee({ status: 'left' }))).rejects.toThrow(
      /CHECK constraint failed/,
    );
    await expect(insertRow(db, 'employees', anEmployee({ left_on: '2025-01-01' }))).rejects.toThrow(
      /CHECK constraint failed/,
    );
  });

  it('rejects a leaving date before the hire date', async () => {
    const db = await dbWithReferenceRows();

    await expect(
      insertRow(db, 'employees', anEmployee({ status: 'left', left_on: '2024-02-01' })),
    ).rejects.toThrow(/CHECK constraint failed/);
  });

  it('rejects an email that is not lower-case', async () => {
    const db = await dbWithReferenceRows();

    await expect(
      insertRow(db, 'employees', anEmployee({ email: 'Ada@acme.example' })),
    ).rejects.toThrow(/CHECK constraint failed/);
  });

  it('rejects a second employee with the same email', async () => {
    const db = await dbWithReferenceRows();
    await insertRow(db, 'employees', anEmployee());

    await expect(insertRow(db, 'employees', anEmployee())).rejects.toThrow(
      /UNIQUE constraint failed/,
    );
  });

  it('rejects an employee in a country that does not exist', async () => {
    const db = await dbWithReferenceRows();

    await expect(insertRow(db, 'employees', anEmployee({ country_code: 'XX' }))).rejects.toThrow(
      /FOREIGN KEY constraint failed/,
    );
  });

  it('treats department names that differ only in case as duplicates', async () => {
    const db = await dbWithReferenceRows();

    await expect(insertRow(db, 'departments', { name: 'engineering' })).rejects.toThrow(
      /UNIQUE constraint failed/,
    );
  });

  it('gives each employee a code made from their id', async () => {
    const db = await dbWithReferenceRows();
    await insertRow(db, 'employees', anEmployee());

    const { rows } = await db.execute('SELECT employee_code FROM employees');

    expect(rows[0]?.employee_code).toBe('EMP-000001');
  });

  it('rejects a salary change with a reason outside the fixed list', async () => {
    const db = await dbWithReferenceRows();
    await insertRow(db, 'employees', anEmployee());

    await expect(
      insertRow(db, 'salary_history', aSalaryChange({ reason: 'bonus' })),
    ).rejects.toThrow(/CHECK constraint failed/);
  });

  it('requires a note when the reason is "other"', async () => {
    const db = await dbWithReferenceRows();
    await insertRow(db, 'employees', anEmployee());

    await expect(
      insertRow(db, 'salary_history', aSalaryChange({ reason: 'other' })),
    ).rejects.toThrow(/CHECK constraint failed/);
  });
});

describe('employee_salaries view', () => {
  async function salaryUsdOf(
    country: Record<string, string>,
    currency: Record<string, string | number>,
    salaryMinor: number,
  ) {
    const db = await migratedDb();
    await insertRow(db, 'currencies', aCurrency(currency));
    await insertRow(db, 'countries', aCountry(country));
    await insertRow(db, 'departments', { name: 'Engineering' });
    await insertRow(db, 'job_titles', { name: 'Software Engineer' });
    await insertRow(
      db,
      'employees',
      anEmployee({ country_code: country.code ?? 'US', current_salary_minor: salaryMinor }),
    );
    const { rows } = await db.execute('SELECT salary_usd, currency_code FROM employee_salaries');
    return rows[0];
  }

  it('converts JPY, which has no minor unit, using the units-per-USD rate', async () => {
    const row = await salaryUsdOf(
      { code: 'JP', name: 'Japan', currency_code: 'JPY' },
      { code: 'JPY', minor_unit: 0, units_per_usd: 150 },
      9_000_000,
    );

    expect(row?.currency_code).toBe('JPY');
    expect(row?.salary_usd).toBeCloseTo(60_000, 6);
  });

  it('converts INR from paise, using the units-per-USD rate', async () => {
    const row = await salaryUsdOf(
      { code: 'IN', name: 'India', currency_code: 'INR' },
      { code: 'INR', minor_unit: 2, units_per_usd: 88 },
      2_200_000_00,
    );

    expect(row?.salary_usd).toBeCloseTo(25_000, 6);
  });

  it('converts KWD from its three-decimal minor unit', async () => {
    const row = await salaryUsdOf(
      { code: 'KW', name: 'Kuwait', currency_code: 'KWD' },
      { code: 'KWD', minor_unit: 3, units_per_usd: 0.307 },
      15_350_000,
    );

    expect(row?.salary_usd).toBeCloseTo(50_000, 6);
  });
});
