import { EmployeeFilters } from '@salary/shared';
import { z } from 'zod';

const { shape } = EmployeeFilters;

/**
 * The directory's URL search params, derived from the shared filter schema (decision D14):
 * not strict, `q` coerced to a string (the router JSON-parses `?q=123` into a number), and
 * every field falls back to its default, so a bad bookmark shows the default view instead
 * of an error page.
 */
export const DirectorySearch = z.object({
  q: z.coerce.string().trim().max(100).optional().catch(undefined),
  country: shape.country.catch(undefined),
  departmentId: shape.departmentId.catch(undefined),
  jobTitleId: shape.jobTitleId.catch(undefined),
  status: shape.status.catch('active'),
  sort: shape.sort.catch('name'),
  page: shape.page.catch(1),
  pageSize: shape.pageSize.catch(25),
});

export type DirectorySearch = z.infer<typeof DirectorySearch>;

/** Defaults are left out of the URL, so a shared link only shows what was chosen. */
export const DIRECTORY_DEFAULTS = {
  status: 'active',
  sort: 'name',
  page: 1,
  pageSize: 25,
} as const satisfies Partial<DirectorySearch>;
