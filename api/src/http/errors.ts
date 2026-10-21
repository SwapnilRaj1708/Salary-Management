import type { ErrorRequestHandler } from 'express';

/**
 * The last error handler: anything not handled earlier becomes a generic RFC 9457 problem.
 * The error is logged for the operator and never sent to the client.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  console.error(`Unhandled error on ${req.method} ${req.originalUrl}`, error);
  res.status(500).type('application/problem+json').json({
    type: 'about:blank',
    title: 'Internal Server Error',
    status: 500,
    code: 'INTERNAL',
    detail: 'Something went wrong on our side. Please try again.',
  });
};
