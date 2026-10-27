import {
  amountAsDecimal,
  COUNTRIES,
  type EmployeeExportQuery,
  type EmployeeListItem,
  FX_AS_OF,
} from '@salary/shared';
import type { Clock } from '../domain/clock.ts';
import { type Cell, decimal, toCsv } from '../domain/csv.ts';
import { todayIn } from '../domain/dates.ts';
import type { EmployeesRepository } from '../employees/repository.ts';

const HEADER = [
  'Employee code',
  'Full name',
  'Email',
  'Country',
  'Department',
  'Job title',
  'Hire date',
  'Status',
  'Left on',
  'Currency',
  'Salary',
  `Salary (USD at ${FX_AS_OF} rates)`,
];

function toRow(employee: EmployeeListItem): Cell[] {
  return [
    employee.employeeCode,
    employee.fullName,
    employee.email,
    COUNTRIES[employee.country].name,
    employee.department,
    employee.jobTitle,
    employee.hireDate,
    employee.status,
    employee.leftOn,
    employee.salary.currency,
    // Plain numbers, so Excel can sum them: local salary from its digits, USD already
    // rounded to cents by the repository.
    decimal(amountAsDecimal(employee.salary)),
    decimal(employee.salaryUsd.toFixed(2)),
  ];
}

/**
 * The directory as a CSV file. Built in memory: 10,000 rows is about 1.5 MB, well under a
 * Vercel Function's response limit (decision X5).
 */
export function exportService({
  employees,
  clock,
  timeZone,
}: {
  employees: EmployeesRepository;
  clock: Clock;
  timeZone: string;
}) {
  return {
    async directoryCsv(query: EmployeeExportQuery): Promise<{ filename: string; body: string }> {
      const rows = (await employees.listAll(query)).map(toRow);
      return {
        filename: `employees-${todayIn(clock.now(), timeZone)}.csv`,
        // The byte-order mark tells Excel the file is UTF-8, so "Müller" survives.
        body: `﻿${toCsv(HEADER, rows)}`,
      };
    },
  };
}

export type ExportService = ReturnType<typeof exportService>;
