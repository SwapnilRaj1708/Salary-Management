import type { AuthUser } from '@salary/shared';
import type { Db } from '../db/client.ts';

export type StoredUser = AuthUser & { passwordHash: string };

export function authRepository(db: Db) {
  return {
    async findUserByEmail(email: string): Promise<StoredUser | undefined> {
      const { rows } = await db.execute({
        sql: 'SELECT id, email, password_hash FROM users WHERE email = ?',
        args: [email],
      });
      const row = rows[0];
      return row
        ? { id: Number(row.id), email: String(row.email), passwordHash: String(row.password_hash) }
        : undefined;
    },

    /** Inserts the user unless one with this email exists; concurrent starts are harmless. */
    async insertUserIfMissing(email: string, passwordHash: string): Promise<void> {
      await db.execute({
        sql: 'INSERT INTO users (email, password_hash) VALUES (?, ?) ON CONFLICT (email) DO NOTHING',
        args: [email, passwordHash],
      });
    },

    async insertSession(tokenHash: string, userId: number, expiresAt: number): Promise<void> {
      await db.execute({
        sql: 'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
        args: [tokenHash, userId, expiresAt],
      });
    },

    /** The user of a session that has not expired at `now`. */
    async findSessionUser(tokenHash: string, now: number): Promise<AuthUser | undefined> {
      const { rows } = await db.execute({
        sql: `SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id
              WHERE s.token_hash = ? AND s.expires_at > ?`,
        args: [tokenHash, now],
      });
      const row = rows[0];
      return row ? { id: Number(row.id), email: String(row.email) } : undefined;
    },

    async deleteSession(tokenHash: string): Promise<void> {
      await db.execute({ sql: 'DELETE FROM sessions WHERE token_hash = ?', args: [tokenHash] });
    },
  };
}

export type AuthRepository = ReturnType<typeof authRepository>;
