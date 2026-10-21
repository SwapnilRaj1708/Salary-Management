import { COUNTRIES, COUNTRY_CODES, CURRENCIES, CURRENCY_CODES, FX_AS_OF } from '@salary/shared';
import type { Db } from './client.ts';

/** The fixed department list (decision D12): grouping keys, so no free text. */
export const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Data',
  'Sales',
  'Marketing',
  'Customer Success',
  'Finance',
  'People',
  'Operations',
] as const;

/** The fixed job-title list (decision D12). The seed's catalogue maps titles to departments. */
export const JOB_TITLES = [
  'Junior Software Engineer',
  'Software Engineer',
  'Senior Software Engineer',
  'Staff Engineer',
  'Engineering Manager',
  'QA Engineer',
  'DevOps Engineer',
  'Product Manager',
  'Senior Product Manager',
  'Product Designer',
  'Senior Product Designer',
  'Data Analyst',
  'Data Scientist',
  'Data Engineer',
  'Sales Development Representative',
  'Account Executive',
  'Sales Manager',
  'Marketing Specialist',
  'Marketing Manager',
  'Support Specialist',
  'Customer Success Manager',
  'Accountant',
  'Financial Analyst',
  'Finance Manager',
  'HR Generalist',
  'Recruiter',
  'People Partner',
  'Operations Coordinator',
  'Office Manager',
  'Operations Manager',
] as const;

export type Department = (typeof DEPARTMENTS)[number];
export type JobTitle = (typeof JOB_TITLES)[number];

/**
 * Copies the reference data from `shared/` and the lists above into the database, in one
 * batch. Unchanged rows are left untouched (the upserts' WHERE skips them), so running it on
 * every cold start costs reads, not writes.
 */
export async function syncReferenceData(db: Db): Promise<void> {
  await db.batch(
    [
      ...CURRENCY_CODES.map((code) => ({
        sql: `INSERT INTO currencies (code, minor_unit, units_per_usd, rate_as_of)
              VALUES (?, ?, ?, ?)
              ON CONFLICT (code) DO UPDATE SET
                minor_unit = excluded.minor_unit,
                units_per_usd = excluded.units_per_usd,
                rate_as_of = excluded.rate_as_of
              WHERE minor_unit IS NOT excluded.minor_unit
                 OR units_per_usd IS NOT excluded.units_per_usd
                 OR rate_as_of IS NOT excluded.rate_as_of`,
        args: [code, BigInt(CURRENCIES[code].minorUnit), CURRENCIES[code].unitsPerUsd, FX_AS_OF],
      })),
      ...COUNTRY_CODES.map((code) => ({
        sql: `INSERT INTO countries (code, name, currency_code) VALUES (?, ?, ?)
              ON CONFLICT (code) DO UPDATE SET
                name = excluded.name,
                currency_code = excluded.currency_code
              WHERE name IS NOT excluded.name OR currency_code IS NOT excluded.currency_code`,
        args: [code, COUNTRIES[code].name, COUNTRIES[code].currency],
      })),
      ...DEPARTMENTS.map((name) => ({
        sql: 'INSERT INTO departments (name) VALUES (?) ON CONFLICT (name) DO NOTHING',
        args: [name],
      })),
      ...JOB_TITLES.map((name) => ({
        sql: 'INSERT INTO job_titles (name) VALUES (?) ON CONFLICT (name) DO NOTHING',
        args: [name],
      })),
    ],
    'write',
  );
}
