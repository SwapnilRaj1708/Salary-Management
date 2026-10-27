/**
 * The message of a failed constraint or trigger RAISE, or undefined for any other error.
 *
 * Callers match a constraint or RAISE name inside it. The code is `SQLITE_CONSTRAINT` both
 * locally and over Turso's HTTP protocol, but the rest differs: Turso leaves
 * `extendedCode` empty and words the message "SQLite error: …" (docs/architecture.md §3).
 */
export function constraintFailure(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  if ((error as { code?: unknown }).code !== 'SQLITE_CONSTRAINT') return undefined;
  return error.message;
}
