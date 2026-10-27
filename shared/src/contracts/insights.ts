import { z } from 'zod';
import { CountryCodeSchema, CurrencyCodeSchema, FxInfo, MoneySchema } from './employees.ts';

// Insights cover active employees only (docs/architecture.md §6). Local amounts are Money
// in minor units; USD figures are dollars rounded to cents, labelled with the rate date.

const Count = z.number().int().nonnegative();

/** One row of `GET /api/insights/by-country`. */
export const CountryInsight = z.object({
  country: CountryCodeSchema,
  currency: CurrencyCodeSchema,
  headcount: Count,
  min: MoneySchema,
  median: MoneySchema,
  avg: MoneySchema,
  max: MoneySchema,
  avgUsd: z.number(),
  payrollUsd: z.number(),
});
export type CountryInsight = z.infer<typeof CountryInsight>;

export const ByCountryResponse = z.object({ items: z.array(CountryInsight), fx: FxInfo });
export type ByCountryResponse = z.infer<typeof ByCountryResponse>;

/** Query of `GET /api/insights/by-job-title`: all countries in USD, or one in local currency. */
export const ByJobTitleQuery = z.object({ country: CountryCodeSchema.optional() }).strict();
export type ByJobTitleQuery = z.infer<typeof ByJobTitleQuery>;

export const JobTitleInsight = z.object({
  jobTitleId: z.number().int().positive(),
  jobTitle: z.string(),
  headcount: Count,
  /** How many countries the title's employees are in. */
  countries: Count,
  /** Mean of the USD values, so each employee counts once. */
  avgUsd: z.number(),
  /** Only when one country is chosen: like-for-like figures in its currency. */
  local: z.object({ min: MoneySchema, avg: MoneySchema, max: MoneySchema }).optional(),
});
export type JobTitleInsight = z.infer<typeof JobTitleInsight>;

export const ByJobTitleResponse = z.object({
  country: CountryCodeSchema.nullable(),
  items: z.array(JobTitleInsight),
  fx: FxInfo,
});
export type ByJobTitleResponse = z.infer<typeof ByJobTitleResponse>;

export const DepartmentInsight = z.object({
  departmentId: z.number().int().positive(),
  department: z.string(),
  headcount: Count,
  payrollUsd: z.number(),
  avgUsd: z.number(),
  /** The department's part of the total payroll, 0–1, to four decimals. */
  share: z.number(),
});
export type DepartmentInsight = z.infer<typeof DepartmentInsight>;

export const ByDepartmentResponse = z.object({
  items: z.array(DepartmentInsight),
  totalUsd: z.number(),
  fx: FxInfo,
});
export type ByDepartmentResponse = z.infer<typeof ByDepartmentResponse>;

/** Query of `GET /api/insights/distribution`: one country, never a mix of currencies. */
export const DistributionQuery = z.object({ country: CountryCodeSchema }).strict();
export type DistributionQuery = z.infer<typeof DistributionQuery>;

export const PERCENTILE_KEYS = ['p10', 'p25', 'p50', 'p75', 'p90'] as const;

export const DistributionResponse = z.object({
  country: CountryCodeSchema,
  currency: CurrencyCodeSchema,
  headcount: Count,
  /** Null when the country has no active employees. */
  percentiles: z
    .object({
      p10: MoneySchema,
      p25: MoneySchema,
      p50: MoneySchema,
      p75: MoneySchema,
      p90: MoneySchema,
    })
    .nullable(),
  /** Equal-width bins in minor units; the lower edge is included, empty bins are kept. */
  buckets: z.array(
    z.object({ fromMinor: z.number().int(), toMinor: z.number().int(), count: Count }),
  ),
});
export type DistributionResponse = z.infer<typeof DistributionResponse>;
