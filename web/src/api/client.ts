import type { z } from 'zod';

/** A problem+json error from the API, with the machine-readable `code` the UI branches on. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, detail: string) {
    super(detail);
    this.status = status;
    this.code = code;
  }
}

export const isUnauthenticated = (error: unknown) =>
  error instanceof ApiError && error.status === 401;

type Request = { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown };

/**
 * Calls the API on the same origin, so the session cookie goes along, and parses the
 * response with a shared zod contract. Any non-2xx response throws an ApiError.
 */
export async function api<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  { method = 'GET', body }: Request = {},
): Promise<z.infer<Schema>> {
  const res = await sendRequest(path, method, body);
  return schema.parse(await res.json());
}

/** Like `api`, for endpoints that answer 204 No Content. */
export async function apiNoContent(path: string, { method = 'POST', body }: Request = {}) {
  await sendRequest(path, method, body);
}

async function sendRequest(path: string, method: string, body: unknown): Promise<Response> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const problem = (await res.json().catch(() => ({}))) as { code?: string; detail?: string };
    throw new ApiError(res.status, problem.code ?? 'UNKNOWN', problem.detail ?? res.statusText);
  }
  return res;
}
