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

/** Copies the reference data into the database. Unchanged rows are left untouched. */
export async function syncReferenceData(_db: Db): Promise<void> {
  throw new Error('Not implemented');
}
