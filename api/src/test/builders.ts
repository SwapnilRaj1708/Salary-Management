import type { InValue } from '@libsql/client';
import type { Db } from '../db/client.ts';

type Row = Record<string, InValue>;

/** Inserts one row with the given columns. For test setup only; app SQL lives in repositories. */
export async function insertRow(db: Db, table: string, row: Row): Promise<void> {
  const columns = Object.keys(row);
  await db.execute({
    sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    args: Object.values(row),
  });
}

export const aCurrency = (overrides: Row = {}): Row => ({
  code: 'USD',
  minor_unit: 2,
  units_per_usd: 1,
  rate_as_of: '2026-10-01',
  ...overrides,
});

export const aCountry = (overrides: Row = {}): Row => ({
  code: 'US',
  name: 'United States',
  currency_code: 'USD',
  ...overrides,
});

export const anEmployee = (overrides: Row = {}): Row => ({
  full_name: 'Ada Lovelace',
  email: 'ada@acme.example',
  job_title_id: 1,
  department_id: 1,
  country_code: 'US',
  hire_date: '2024-03-01',
  current_salary_minor: 9_000_000,
  ...overrides,
});

export const aSalaryChange = (overrides: Row = {}): Row => ({
  employee_id: 1,
  amount_minor: 9_000_000,
  currency_code: 'USD',
  effective_date: '2024-03-01',
  reason: 'hire',
  ...overrides,
});

/** USD and the United States, one department and one job title: enough to insert employees. */
export async function withUsReferenceRows(db: Db): Promise<void> {
  await insertRow(db, 'currencies', aCurrency());
  await insertRow(db, 'countries', aCountry());
  await insertRow(db, 'departments', { name: 'Engineering' });
  await insertRow(db, 'job_titles', { name: 'Software Engineer' });
}
