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

describe('salary history and leaver triggers', () => {
  /** Ada, hired 2024-03-01 on 9,000,000 minor units, with her hire row. */
  async function dbWithAda() {
    const db = await dbWithReferenceRows();
    await insertRow(db, 'employees', anEmployee());
    await insertRow(db, 'salary_history', aSalaryChange());
    return db;
  }

  const raise = (overrides: Record<string, string | number> = {}) =>
    aSalaryChange({
      amount_minor: 9_500_000,
      effective_date: '2025-03-01',
      reason: 'annual_review',
      ...overrides,
    });

  it('rejects a salary change dated before the latest one, naming the rule', async () => {
    const db = await dbWithAda();
    await insertRow(db, 'salary_history', raise());

    await expect(
      insertRow(
        db,
        'salary_history',
        raise({ amount_minor: 9_800_000, effective_date: '2025-02-28' }),
      ),
    ).rejects.toThrow(/EFFECTIVE_DATE_BEFORE_LATEST_CHANGE/);
  });

  it('accepts a second change on the same day as the latest one', async () => {
    const db = await dbWithAda();
    await insertRow(db, 'salary_history', raise());

    await insertRow(db, 'salary_history', raise({ amount_minor: 9_600_000, reason: 'correction' }));

    const { rows } = await db.execute('SELECT count(*) AS n FROM salary_history');
    expect(rows[0]?.n).toBe(3);
  });

  it('rejects a change that leaves the salary where it is', async () => {
    const db = await dbWithAda();

    await expect(
      insertRow(db, 'salary_history', raise({ amount_minor: 9_000_000 })),
    ).rejects.toThrow(/SALARY_UNCHANGED/);
  });

  it('rejects a second hire row', async () => {
    const db = await dbWithAda();

    await expect(insertRow(db, 'salary_history', raise({ reason: 'hire' }))).rejects.toThrow(
      /HIRE_ALREADY_RECORDED/,
    );
  });

  it('rejects a salary change for an employee who has left', async () => {
    const db = await dbWithAda();
    await db.execute("UPDATE employees SET status = 'left', left_on = '2025-06-30' WHERE id = 1");

    await expect(
      insertRow(db, 'salary_history', raise({ effective_date: '2025-06-30' })),
    ).rejects.toThrow(/EMPLOYEE_LEFT/);
  });

  it('rejects any change to an employee who has left', async () => {
    const db = await dbWithAda();
    await db.execute("UPDATE employees SET status = 'left', left_on = '2025-06-30' WHERE id = 1");

    await expect(
      db.execute("UPDATE employees SET full_name = 'Ada King' WHERE id = 1"),
    ).rejects.toThrow(/EMPLOYEE_LEFT/);
  });

  it('rejects a leaving date before the latest salary change', async () => {
    const db = await dbWithAda();
    await insertRow(db, 'salary_history', raise());

    await expect(
      db.execute("UPDATE employees SET status = 'left', left_on = '2025-02-28' WHERE id = 1"),
    ).rejects.toThrow(/LEFT_BEFORE_LATEST_CHANGE/);
  });
});
