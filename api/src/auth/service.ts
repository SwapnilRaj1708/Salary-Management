import { createHash, randomBytes } from 'node:crypto';
import type { AuthUser } from '@salary/shared';
import type { Clock } from '../domain/clock.ts';
import { InvalidCredentialsError } from '../domain/errors.ts';
import { hashPassword, type ScryptParams, verifyPassword } from './password.ts';
import type { AuthRepository } from './repository.ts';

/** How long a session lasts after login (docs/architecture.md §9). */
export const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

// The hash of a random, discarded password. Checking an unknown email against it costs the
// same scrypt work as a wrong password, so response times don't reveal which emails exist.
const DUMMY_HASH =
  'scrypt$32768$8$3$MlXuVGq4abeYFxnqjhhuqQ==$V8orw8ahNvCO11dme9fHVSN9W77snXkcZ3QlgKcbKL+Dlqdfkpy7LP0EzCrhIgnsvRhIcZoVjh+zE4PH/VWjnQ==';

const normaliseEmail = (email: string) => email.trim().toLowerCase();
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export type Session = { user: AuthUser; token: string; expiresAt: number };

export function authService({ repo, clock }: { repo: AuthRepository; clock: Clock }) {
  return {
    /** Signs in, or throws the same InvalidCredentialsError for any wrong email or password. */
    async login(email: string, password: string): Promise<Session> {
      const user = await repo.findUserByEmail(normaliseEmail(email));
      const matches = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !matches) throw new InvalidCredentialsError();

      const token = randomBytes(32).toString('base64url');
      const expiresAt = clock.now() + SESSION_LIFETIME_MS;
      await repo.insertSession(hashToken(token), user.id, expiresAt);
      return { user: { id: user.id, email: user.email }, token, expiresAt };
    },

    async logout(token: string): Promise<void> {
      await repo.deleteSession(hashToken(token));
    },

    /** The signed-in user for a session token, or undefined if it is unknown or expired. */
    async currentUser(token: string | undefined): Promise<AuthUser | undefined> {
      return token ? repo.findSessionUser(hashToken(token), clock.now()) : undefined;
    },

    /** Creates the configured HR user if no user has that email yet. */
    async ensureHrUser(
      { email, password }: { email: string; password: string },
      params?: ScryptParams,
    ): Promise<void> {
      const normalised = normaliseEmail(email);
      if (await repo.findUserByEmail(normalised)) return;
      await repo.insertUserIfMissing(normalised, await hashPassword(password, params));
    },
  };
}

export type AuthService = ReturnType<typeof authService>;
