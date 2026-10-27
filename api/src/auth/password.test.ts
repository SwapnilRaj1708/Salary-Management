import { describe, expect, it } from 'vitest';
import { hashPassword, OWASP_SCRYPT, verifyPassword } from './password.ts';

// Cheap parameters keep these tests fast; the hash format records them either way.
const FAST = { N: 2 ** 10, r: 8, p: 1 };

describe('password hashing', () => {
  it('accepts the password it hashed', async () => {
    const stored = await hashPassword('local-demo-password', FAST);

    expect(await verifyPassword('local-demo-password', stored)).toBe(true);
  });

  it('rejects a different password', async () => {
    const stored = await hashPassword('local-demo-password', FAST);

    expect(await verifyPassword('password@123', stored)).toBe(false);
  });

  it('salts every hash, so the same password never gives the same hash twice', async () => {
    expect(await hashPassword('same', FAST)).not.toBe(await hashPassword('same', FAST));
  });

  it('records its parameters in the hash, so they can be raised later', async () => {
    const stored = await hashPassword('local-demo-password', FAST);

    expect(stored).toMatch(/^scrypt\$1024\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  });

  it("uses OWASP's scrypt parameters by default", async () => {
    const stored = await hashPassword('local-demo-password');

    expect(stored.split('$').slice(1, 4)).toEqual([
      String(OWASP_SCRYPT.N),
      String(OWASP_SCRYPT.r),
      String(OWASP_SCRYPT.p),
    ]);
    expect(await verifyPassword('local-demo-password', stored)).toBe(true);
  });

  it.each(['', 'plain-text', 'scrypt$1024$8$1$c2FsdA==', 'bcrypt$x$y$z$a$b', 'scrypt$x$8$1$a$b'])(
    'treats the malformed stored hash %j as no match instead of throwing',
    async (stored) => {
      expect(await verifyPassword('anything', stored)).toBe(false);
    },
  );
});
