import {
  COUNTRIES,
  type CreateEmployeeRequest,
  type EmployeeDetail,
  type SalaryChangeRequest,
  type UpdateEmployeeRequest,
} from '@salary/shared';
import type { Clock } from '../domain/clock.ts';
import { type IsoDate, todayIn } from '../domain/dates.ts';
import {
  ConflictError,
  DateOutOfRangeError,
  employeeLeft,
  NotFoundError,
  UnknownReferenceError,
} from '../domain/errors.ts';
import type { EmployeesRepository } from './repository.ts';

/** The earliest hire date the app accepts (docs/architecture.md §8). */
export const EARLIEST_HIRE_DATE = '1950-01-01';

type Detail = Omit<EmployeeDetail, 'fx'>;

/**
 * The record use-cases. Each checks the rules that depend on stored data for a clear
 * error, then writes one batch, which the database checks again (decision D17).
 */
export function employeesService({
  repo,
  clock,
  timeZone,
}: {
  repo: EmployeesRepository;
  clock: Clock;
  timeZone: string;
}) {
  const today = (): IsoDate => todayIn(clock.now(), timeZone);

  async function load(id: number): Promise<Detail> {
    const employee = await repo.findDetail(id);
    if (!employee) throw new NotFoundError(`There is no employee with id ${id}.`);
    return employee;
  }

  async function loadActive(id: number): Promise<Detail> {
    const employee = await load(id);
    if (employee.status === 'left') throw employeeLeft();
    return employee;
  }

  async function checkReferences(ids: { departmentId?: number; jobTitleId?: number }) {
    const missing = await repo.missingReferences(ids);
    if (missing.length > 0) {
      throw new UnknownReferenceError(`The ${missing.join(' and ')} does not exist.`);
    }
  }

  return {
    detail: load,

    async create(input: CreateEmployeeRequest, changedBy: number): Promise<Detail> {
      const latest = today();
      if (input.hireDate < EARLIEST_HIRE_DATE || input.hireDate > latest) {
        throw new DateOutOfRangeError(
          `The hire date must be between ${EARLIEST_HIRE_DATE} and today, ${latest}.`,
        );
      }
      await checkReferences(input);
      const id = await repo.create({
        ...input,
        currency: COUNTRIES[input.countryCode].currency,
        changedBy,
      });
      return load(id);
    },

    async update(id: number, changes: UpdateEmployeeRequest): Promise<Detail> {
      await loadActive(id);
      await checkReferences(changes);
      await repo.update(id, changes);
      return load(id);
    },

    async changeSalary(id: number, change: SalaryChangeRequest, changedBy: number) {
      const employee = await loadActive(id);
      const latest = employee.salaryHistory[0]?.effectiveDate ?? employee.hireDate;
      const last = today();
      if (change.effectiveDate > last) {
        throw new DateOutOfRangeError(`The effective date can't be after today, ${last}.`);
      }
      if (change.effectiveDate < latest) {
        throw new ConflictError(
          'EFFECTIVE_DATE_BEFORE_LATEST_CHANGE',
          `The effective date can't be before the latest salary change, on ${latest}.`,
        );
      }
      if (change.amountMinor === employee.salary.amountMinor) {
        throw new ConflictError(
          'SALARY_UNCHANGED',
          'The new salary is the same as the current one.',
        );
      }
      await repo.addSalaryChange({
        employeeId: id,
        amountMinor: change.amountMinor,
        currency: employee.salary.currency,
        effectiveDate: change.effectiveDate,
        reason: change.reason,
        note: change.note ?? null,
        changedBy,
      });
      return load(id);
    },

    async leave(id: number, leftOn: IsoDate): Promise<Detail> {
      const employee = await loadActive(id);
      const latestChange = employee.salaryHistory[0]?.effectiveDate ?? employee.hireDate;
      const earliest = latestChange > employee.hireDate ? latestChange : employee.hireDate;
      const last = today();
      if (leftOn < earliest || leftOn > last) {
        throw new DateOutOfRangeError(
          `The leaving date must be between ${earliest} (the hire date or latest salary change) and today, ${last}.`,
        );
      }
      await repo.markLeft(id, leftOn);
      return load(id);
    },
  };
}

export type EmployeesService = ReturnType<typeof employeesService>;
