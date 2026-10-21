import type { CountryCode } from '@salary/shared';
import type { Department, JobTitle } from '../db/reference.ts';
import type { IsoDate } from '../domain/dates.ts';
import type { Rng } from './prng.ts';

export type SeedReason = 'hire' | 'annual_review' | 'promotion' | 'market_adjustment';

export type SeedSalaryChange = { effectiveDate: IsoDate; amountMinor: number; reason: SeedReason };

export type SeedEmployee = {
  fullName: string;
  email: string;
  countryCode: CountryCode;
  department: Department;
  jobTitle: JobTitle;
  hireDate: IsoDate;
  /** The leaving date for a leaver; null while employed. */
  leftOn: IsoDate | null;
  /** The latest history amount, cached (decision D5). */
  salaryMinor: number;
  /** Oldest first; the first row is the hire. */
  history: SeedSalaryChange[];
};

export type GenerateOptions = { rng: Rng; count: number; asOf: IsoDate };

/** Builds the seeded organisation. Pure: the same options give the same result. */
export function generateOrg(_options: GenerateOptions): SeedEmployee[] {
  throw new Error('Not implemented');
}
