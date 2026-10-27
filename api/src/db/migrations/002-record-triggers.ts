import type { Migration } from '../migrate.ts';

/**
 * The database's half of the rules that depend on stored data (decision D17). The service
 * checks each rule first for a clear error; these triggers enforce it again inside the
 * write batch, so a concurrent request can't slip past the check. Each RAISE message is
 * the API error code, which the repository maps back to its DomainError.
 */
export const recordTriggers: Migration = {
  version: 2,
  name: 'record-triggers',
  statements: [
    `CREATE TRIGGER salary_history_employee_left
    BEFORE INSERT ON salary_history
    WHEN (SELECT status FROM employees WHERE id = NEW.employee_id) = 'left'
    BEGIN
      SELECT RAISE(ABORT, 'EMPLOYEE_LEFT');
    END`,

    `CREATE TRIGGER salary_history_hire_first
    BEFORE INSERT ON salary_history
    WHEN NEW.reason = 'hire'
      AND EXISTS (SELECT 1 FROM salary_history WHERE employee_id = NEW.employee_id)
    BEGIN
      SELECT RAISE(ABORT, 'HIRE_ALREADY_RECORDED');
    END`,

    // The same day as the latest change is allowed; the row recorded later wins.
    `CREATE TRIGGER salary_history_in_order
    BEFORE INSERT ON salary_history
    WHEN EXISTS (
      SELECT 1 FROM salary_history
      WHERE employee_id = NEW.employee_id AND effective_date > NEW.effective_date
    )
    BEGIN
      SELECT RAISE(ABORT, 'EFFECTIVE_DATE_BEFORE_LATEST_CHANGE');
    END`,

    `CREATE TRIGGER salary_history_changes_amount
    BEFORE INSERT ON salary_history
    WHEN NEW.amount_minor = (
      SELECT amount_minor FROM salary_history
      WHERE employee_id = NEW.employee_id
      ORDER BY effective_date DESC, id DESC
      LIMIT 1
    )
    BEGIN
      SELECT RAISE(ABORT, 'SALARY_UNCHANGED');
    END`,

    // A leaver's record is read-only: nothing on the row changes after they leave.
    `CREATE TRIGGER employees_left_read_only
    BEFORE UPDATE ON employees
    WHEN OLD.status = 'left'
    BEGIN
      SELECT RAISE(ABORT, 'EMPLOYEE_LEFT');
    END`,

    `CREATE TRIGGER employees_left_after_latest_change
    BEFORE UPDATE OF status, left_on ON employees
    WHEN NEW.status = 'left'
      AND EXISTS (
        SELECT 1 FROM salary_history
        WHERE employee_id = NEW.id AND effective_date > NEW.left_on
      )
    BEGIN
      SELECT RAISE(ABORT, 'LEFT_BEFORE_LATEST_CHANGE');
    END`,
  ],
};
