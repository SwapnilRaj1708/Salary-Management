import { describe, expect, it } from 'vitest';
import { EmployeeFilters, EmployeeListQuery } from './employees.ts';

describe('EmployeeListQuery', () => {
  it('fills in the defaults: active employees by name, page 1 of 25', () => {
    expect(EmployeeListQuery.parse({})).toEqual({
      status: 'active',
      sort: 'name',
      page: 1,
      pageSize: 25,
    });
  });

  it('reads numbers from query-string text', () => {
    expect(EmployeeListQuery.parse({ page: '3', pageSize: '50', departmentId: '2' })).toMatchObject(
      {
        page: 3,
        pageSize: 50,
        departmentId: 2,
      },
    );
  });

  it.each([
    [{ sort: 'salary' }],
    [{ sort: 'name; DROP TABLE employees' }],
    [{ pageSize: '101' }],
    [{ page: '0' }],
    [{ country: 'XX' }],
    [{ status: 'everyone' }],
    [{ unexpected: '1' }],
  ])('rejects %j', (query) => {
    expect(EmployeeListQuery.safeParse(query).success).toBe(false);
  });
});

describe('EmployeeFilters', () => {
  it('ignores unknown fields instead of failing, for the web route that derives from it', () => {
    expect(EmployeeFilters.parse({ utm_source: 'mail' })).toEqual(EmployeeListQuery.parse({}));
  });
});
