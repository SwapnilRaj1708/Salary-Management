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

/** Query of `GET /api/employees/export.csv`: the directory's filters and sort, no paging. */
export const EmployeeExportQuery = EmployeeFilters.omit({ page: true, pageSize: true }).strict();
export type EmployeeExportQuery = z.infer<typeof EmployeeExportQuery>;

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

/** A real calendar date written `YYYY-MM-DD` (2024-02-30 is rejected). */
export const IsoDateSchema = z.iso.date();

/** Reasons HR can give for a salary change. `hire` is reserved for the first row. */
export const SALARY_CHANGE_REASONS = [
  'annual_review',
  'promotion',
  'market_adjustment',
  'correction',
  'other',
] as const;
export const SalaryChangeReason = z.enum(SALARY_CHANGE_REASONS);
export type SalaryChangeReason = z.infer<typeof SalaryChangeReason>;
export const SalaryReason = z.enum(['hire', ...SALARY_CHANGE_REASONS]);
export type SalaryReason = z.infer<typeof SalaryReason>;

/** A positive whole number of minor units that a JavaScript number holds exactly. */
const AmountMinor = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const Id = z.number().int().positive();
const FullName = z.string().trim().min(1).max(200);
const Email = z.string().trim().toLowerCase().pipe(z.email().max(254));

/** Body of `POST /api/employees`. The salary is in the country's currency. */
export const CreateEmployeeRequest = z
  .object({
    fullName: FullName,
    email: Email,
    jobTitleId: Id,
    departmentId: Id,
    countryCode: CountryCodeSchema,
    hireDate: IsoDateSchema,
    salaryMinor: AmountMinor,
  })
  .strict();
export type CreateEmployeeRequest = z.infer<typeof CreateEmployeeRequest>;

/** Body of `PATCH /api/employees/:id`: any of these, at least one. */
export const UpdateEmployeeRequest = z
  .object({
    fullName: FullName,
    email: Email,
    jobTitleId: Id,
    departmentId: Id,
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Change at least one field' });
export type UpdateEmployeeRequest = z.infer<typeof UpdateEmployeeRequest>;

/** Body of `POST /api/employees/:id/salary-changes`. A blank note counts as no note. */
export const SalaryChangeRequest = z
  .object({
    amountMinor: AmountMinor,
    effectiveDate: IsoDateSchema,
    reason: SalaryChangeReason,
    note: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((note) => note || undefined),
  })
  .strict()
  .refine((body) => body.reason !== 'other' || body.note !== undefined, {
    message: 'Add a note when the reason is "other"',
    path: ['note'],
  });
export type SalaryChangeRequest = z.infer<typeof SalaryChangeRequest>;

/** Body of `POST /api/employees/:id/leave`. */
export const LeaveRequest = z.object({ leftOn: IsoDateSchema }).strict();
export type LeaveRequest = z.infer<typeof LeaveRequest>;

export const SalaryHistoryEntry = z.object({
  id: Id,
  effectiveDate: z.string(),
  amount: MoneySchema,
  reason: SalaryReason,
  note: z.string().nullable(),
  /** Change from the previous row in per cent, to one decimal; null for the hire row. */
  changePercent: z.number().nullable(),
});
export type SalaryHistoryEntry = z.infer<typeof SalaryHistoryEntry>;

/** An employee with their salary history, newest first. */
export const EmployeeDetail = EmployeeListItem.extend({
  salaryHistory: z.array(SalaryHistoryEntry),
  fx: FxInfo,
});
export type EmployeeDetail = z.infer<typeof EmployeeDetail>;
