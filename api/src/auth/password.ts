import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/** scrypt cost parameters. The hash string records them, so they can be raised later. */
export type ScryptParams = { N: number; r: number; p: number };

/** OWASP's scrypt setting N=2^15, r=8, p=3 (decision D9). About 0.4 s per hash. */
export const OWASP_SCRYPT: ScryptParams = { N: 2 ** 15, r: 8, p: 3 };

const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

/** Hashes a password as `scrypt$N$r$p$salt$hash`, with a random 16-byte salt. */
export async function hashPassword(
  password: string,
  params: ScryptParams = OWASP_SCRYPT,
): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, params);
  return [
    'scrypt',
    params.N,
    params.r,
    params.p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

/** Checks a password against a stored hash in constant time. A malformed hash never matches. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, key, ...rest] = stored.split('$');
  const params = { N: Number(n), r: Number(r), p: Number(p) };
  if (
    scheme !== 'scrypt' ||
    rest.length > 0 ||
    !salt ||
    !key ||
    !Object.values(params).every((value) => Number.isSafeInteger(value) && value > 0)
  ) {
    return false;
  }
  const expected = Buffer.from(key, 'base64');
  try {
    const actual = await derive(password, Buffer.from(salt, 'base64'), params, expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function derive(
  password: string,
  salt: Buffer,
  { N, r, p }: ScryptParams,
  length = KEY_LENGTH,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Node's default maxmem (32 MiB) rejects N=2^15, r=8, which needs just over 32 MiB.
    scrypt(password, salt, length, { N, r, p, maxmem: MAX_MEMORY }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}
