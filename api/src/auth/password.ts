/** scrypt cost parameters. The hash string records them, so they can be raised later. */
export type ScryptParams = { N: number; r: number; p: number };

/** OWASP's scrypt setting N=2^15, r=8, p=3 (decision D9). About 0.4 s per hash. */
export const OWASP_SCRYPT: ScryptParams = { N: 2 ** 15, r: 8, p: 3 };

/** Hashes a password as `scrypt$N$r$p$salt$hash`, with a random 16-byte salt. */
export async function hashPassword(
  _password: string,
  _params: ScryptParams = OWASP_SCRYPT,
): Promise<string> {
  throw new Error('Not implemented');
}

/** Checks a password against a stored hash in constant time. A malformed hash never matches. */
export async function verifyPassword(_password: string, _stored: string): Promise<boolean> {
  throw new Error('Not implemented');
}
