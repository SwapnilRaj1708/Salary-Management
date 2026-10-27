import type { z } from 'zod';
import { ValidationError } from '../domain/errors.ts';

/** Parses input with a shared zod contract, or throws a ValidationError listing each field. */
export function parseWith<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.infer<Schema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new ValidationError(
    result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  );
}
