import { z } from 'zod';
import {
  COUNTRY_CODES,
  type CountryCode,
  CURRENCY_CODES,
  type CurrencyCode,
} from '../reference.ts';

export const CountryCodeSchema = z.enum(COUNTRY_CODES as [CountryCode, ...CountryCode[]]);
export const CurrencyCodeSchema = z.enum(CURRENCY_CODES as [CurrencyCode, ...CurrencyCode[]]);

/** An amount in a currency's minor unit (decision D3). */
export const MoneySchema = z.object({
  amountMinor: z.number().int(),
  currency: CurrencyCodeSchema,
});

/** Directory sort keys; a leading `-` sorts descending. Each maps to a fixed SQL fragment. */
export const EMPLOYEE_SORT_FIELDS = [
  'name',
  'employeeCode',
  'hireDate',
  'country',
  'department',
  'jobTitle',
  'salaryUsd',
] as const;
export type EmployeeSortField = (typeof EMPLOYEE_SORT_FIELDS)[number];

export const EmployeeSort = z.enum([
  'name',
  'employeeCode',
  'hireDate',
  'country',
  'department',
  'jobTitle',
  'salaryUsd',
  '-name',
  '-employeeCode',
  '-hireDate',
  '-country',
  '-department',
  '-jobTitle',
  '-salaryUsd',
]);
export type EmployeeSort = z.infer<typeof EmployeeSort>;

export const EmployeeStatusFilter = z.enum(['active', 'left', 'all']);

/**
 * The directory filters. Not strict: the web app derives its route search schema from this
 * (docs/decisions.md D14). The API uses the strict `EmployeeListQuery` below.
 */
export const EmployeeFilters = z.object({
  q: z.string().trim().max(100).optional(),
  country: CountryCodeSchema.optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  jobTitleId: z.coerce.number().int().positive().optional(),
  status: EmployeeStatusFilter.default('active'),
  sort: EmployeeSort.default('name'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type EmployeeFilters = z.infer<typeof EmployeeFilters>;

/** Query string of `GET /api/employees`. Strict, like every request schema. */
export const EmployeeListQuery = EmployeeFilters.strict();

export const EmployeeListItem = z.object({
  id: z.number().int().positive(),
  employeeCode: z.string(),
  fullName: z.string(),
  email: z.string(),
  country: CountryCodeSchema,
  departmentId: z.number().int(),
  department: z.string(),
  jobTitleId: z.number().int(),
  jobTitle: z.string(),
  hireDate: z.string(),
  status: z.enum(['active', 'left']),
  leftOn: z.string().nullable(),
  salary: MoneySchema,
  /** Converted in the database view at the static rate, rounded to cents. */
  salaryUsd: z.number(),
});
export type EmployeeListItem = z.infer<typeof EmployeeListItem>;

/** The rate snapshot every USD figure is based on, so screens can label it. */
export const FxInfo = z.object({ asOf: z.string() });

export const EmployeeListResponse = z.object({
  items: z.array(EmployeeListItem),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  fx: FxInfo,
});
export type EmployeeListResponse = z.infer<typeof EmployeeListResponse>;

const NamedRef = z.object({ id: z.number().int().positive(), name: z.string() });

/** Body of `GET /api/reference-data`: the lists filters and forms choose from. */
export const ReferenceDataResponse = z.object({
  departments: z.array(NamedRef),
  jobTitles: z.array(NamedRef),
});
export type ReferenceDataResponse = z.infer<typeof ReferenceDataResponse>;
