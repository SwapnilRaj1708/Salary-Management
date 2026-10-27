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
