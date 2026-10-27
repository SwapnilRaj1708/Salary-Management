/** A failure the client can act on. The error handler maps it to RFC 9457 problem+json. */
export class DomainError extends Error {
  readonly status: number;
  readonly code: string;
  readonly title: string;

  constructor(status: number, code: string, title: string, detail: string) {
    super(detail);
    this.status = status;
    this.code = code;
    this.title = title;
  }
}

export type FieldError = { path: string; message: string };

export class ValidationError extends DomainError {
  readonly errors: FieldError[];

  constructor(errors: FieldError[]) {
    super(400, 'VALIDATION_FAILED', 'Validation failed', 'The request is not valid.');
    this.errors = errors;
  }
}

export class UnauthenticatedError extends DomainError {
  constructor() {
    super(401, 'UNAUTHENTICATED', 'Unauthorized', 'Sign in to continue.');
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super(401, 'INVALID_CREDENTIALS', 'Unauthorized', 'The email or password is incorrect.');
  }
}

export class NotFoundError extends DomainError {
  constructor(detail: string) {
    super(404, 'NOT_FOUND', 'Not Found', detail);
  }
}

/** A request that conflicts with the stored state, such as a taken email (409). */
export class ConflictError extends DomainError {
  constructor(
    code:
      | 'EMAIL_TAKEN'
      | 'EMPLOYEE_LEFT'
      | 'SALARY_UNCHANGED'
      | 'EFFECTIVE_DATE_BEFORE_LATEST_CHANGE',
    detail: string,
  ) {
    super(409, code, 'Conflict', detail);
  }
}

/** A hire date, effective date or leaving date outside its allowed range. */
export class DateOutOfRangeError extends DomainError {
  constructor(detail: string) {
    super(400, 'DATE_OUT_OF_RANGE', 'Date out of range', detail);
  }
}

/** A department or job title id that does not exist. */
export class UnknownReferenceError extends DomainError {
  constructor(detail: string) {
    super(400, 'UNKNOWN_REFERENCE', 'Unknown reference', detail);
  }
}

export const employeeLeft = () =>
  new ConflictError('EMPLOYEE_LEFT', 'This employee has left, so their record is read-only.');
