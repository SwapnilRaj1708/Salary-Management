import type { ErrorRequestHandler, Response } from 'express';
import { DomainError, ValidationError } from '../domain/errors.ts';

function problem(res: Response, status: number, body: Record<string, unknown>): void {
  res
    .status(status)
    .type('application/problem+json')
    .json({ type: 'about:blank', status, ...body });
}

/**
 * The last error handler (decision X4): a DomainError becomes RFC 9457 problem+json with its
 * code; a body-parser error keeps its own 4xx status; anything else is a generic 500 that is
 * logged for the operator and never sent to the client.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof DomainError) {
    problem(res, error.status, {
      title: error.title,
      code: error.code,
      detail: error.message,
      ...(error instanceof ValidationError ? { errors: error.errors } : {}),
    });
    return;
  }

  // express.json() marks its errors with a `type` and an HTTP status.
  if (typeof error?.type === 'string' && error.status >= 400 && error.status < 500) {
    if (error.type === 'entity.parse.failed') {
      problem(res, 400, {
        title: 'Validation failed',
        code: 'VALIDATION_FAILED',
        detail: 'The request body is not valid JSON.',
        errors: [{ path: '', message: 'Malformed JSON' }],
      });
    } else if (error.status === 413) {
      problem(res, 413, {
        title: 'Payload Too Large',
        code: 'PAYLOAD_TOO_LARGE',
        detail: 'The request body is too large.',
      });
    } else {
      problem(res, error.status, {
        title: 'Bad Request',
        code: 'BAD_REQUEST',
        detail: 'The request body could not be read.',
      });
    }
    return;
  }

  console.error(`Unhandled error on ${req.method} ${req.originalUrl}`, error);
  problem(res, 500, {
    title: 'Internal Server Error',
    code: 'INTERNAL',
    detail: 'Something went wrong on our side. Please try again.',
  });
};
