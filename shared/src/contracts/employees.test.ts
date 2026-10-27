import { describe, expect, it } from 'vitest';
import {
  CreateEmployeeRequest,
  EmployeeExportQuery,
  EmployeeFilters,
  EmployeeListQuery,
  LeaveRequest,
  SalaryChangeRequest,
  UpdateEmployeeRequest,
} from './employees.ts';

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

const newHire = {
  fullName: '  Ada Lovelace ',
  email: ' Ada@ACME.example ',
  jobTitleId: 2,
  departmentId: 1,
  countryCode: 'GB',
  hireDate: '2026-10-01',
  salaryMinor: 5_000_000,
};

describe('CreateEmployeeRequest', () => {
  it('trims the name and stores the email trimmed and in lower case', () => {
    expect(CreateEmployeeRequest.parse(newHire)).toMatchObject({
      fullName: 'Ada Lovelace',
      email: 'ada@acme.example',
    });
  });

  it.each([
    [{ hireDate: '2024-02-30' }],
    [{ hireDate: '01/10/2026' }],
    [{ salaryMinor: 0 }],
    [{ salaryMinor: 100.5 }],
    [{ salaryMinor: 2 ** 53 }],
    [{ email: 'not an email' }],
    [{ fullName: '   ' }],
    [{ countryCode: 'XX' }],
    [{ status: 'left' }],
  ])('rejects %j', (change) => {
    expect(CreateEmployeeRequest.safeParse({ ...newHire, ...change }).success).toBe(false);
  });
});

describe('UpdateEmployeeRequest', () => {
  it('accepts any one field', () => {
    expect(UpdateEmployeeRequest.parse({ departmentId: 3 })).toEqual({ departmentId: 3 });
  });

  it('rejects an empty change, and fields that are fixed after hiring', () => {
    expect(UpdateEmployeeRequest.safeParse({}).success).toBe(false);
    expect(UpdateEmployeeRequest.safeParse({ countryCode: 'US' }).success).toBe(false);
    expect(UpdateEmployeeRequest.safeParse({ hireDate: '2020-01-01' }).success).toBe(false);
  });
});

describe('SalaryChangeRequest', () => {
  const raise = { amountMinor: 9_500_000, effectiveDate: '2026-10-01', reason: 'annual_review' };

  it('accepts a change without a note, and treats a blank note as none', () => {
    expect(SalaryChangeRequest.parse({ ...raise, note: '  ' })).toEqual(raise);
  });

  it('reserves "hire" for the first history row', () => {
    expect(SalaryChangeRequest.safeParse({ ...raise, reason: 'hire' }).success).toBe(false);
  });

  it('asks for a note when the reason is "other"', () => {
    const result = SalaryChangeRequest.safeParse({ ...raise, reason: 'other', note: ' ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['note']);
  });
});

describe('LeaveRequest', () => {
  it('needs a real leaving date', () => {
    expect(LeaveRequest.parse({ leftOn: '2026-10-27' })).toEqual({ leftOn: '2026-10-27' });
    expect(LeaveRequest.safeParse({ leftOn: '2026-13-01' }).success).toBe(false);
  });
});

describe('EmployeeExportQuery', () => {
  it('takes the directory filters and sort, with the same defaults', () => {
    expect(EmployeeExportQuery.parse({ country: 'JP', sort: '-salaryUsd' })).toEqual({
      country: 'JP',
      status: 'active',
      sort: '-salaryUsd',
    });
  });

  it('rejects paging, because an export covers every match', () => {
    expect(EmployeeExportQuery.safeParse({ page: '2' }).success).toBe(false);
    expect(EmployeeExportQuery.safeParse({ pageSize: '25' }).success).toBe(false);
  });
});
