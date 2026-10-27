import { ApiError } from '../../api/client.ts';

/** Field name → message, shown as each field's helper text. */
export type FieldErrors = Partial<Record<string, string>>;

/** Turns zod issues or API `errors[]` into one message per top-level field. */
export function toFieldErrors(
  issues: readonly { path: readonly PropertyKey[] | string; message: string }[],
): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = String(
      typeof issue.path === 'string' ? issue.path.split('.')[0] : (issue.path[0] ?? ''),
    );
    errors[field] ??= issue.message;
  }
  return errors;
}

/** Wording for API error codes that are not about one field (docs/design-system.md §5). */
const PROBLEM_MESSAGES: Record<string, string> = {
  EMPLOYEE_LEFT: 'This employee has left, so their record is read-only.',
  UNKNOWN_REFERENCE:
    'That department or job title no longer exists. Reload the page and try again.',
  NOT_FOUND: 'This employee no longer exists.',
};

/**
 * Splits a failed save into field messages and a general message. `fieldsByCode` places
 * an error code on the field it is about, with its wording.
 */
export function describeSaveError(
  error: unknown,
  fieldsByCode: Partial<Record<string, [field: string, message: string]>> = {},
): { fields: FieldErrors; message?: string } {
  if (error instanceof ApiError) {
    if (error.code === 'VALIDATION_FAILED' && error.errors.length > 0) {
      return { fields: toFieldErrors(error.errors) };
    }
    const placed = fieldsByCode[error.code];
    if (placed) return { fields: { [placed[0]]: placed[1] } };
    const message = PROBLEM_MESSAGES[error.code];
    if (message) return { fields: {}, message };
  }
  return { fields: {}, message: 'Something went wrong while saving. Please try again.' };
}
