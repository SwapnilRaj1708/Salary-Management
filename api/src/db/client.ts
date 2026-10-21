import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { type Client, createClient } from '@libsql/client';

export type Db = Client;

export type DbConfig = { url: string; authToken?: string | undefined };

/**
 * Opens the database: Turso (`libsql://…`), a local file (`file:…`) or `:memory:`.
 * File URLs wait up to 5 s for another process's lock instead of failing at once with
 * SQLITE_BUSY; remote clients ignore the timeout (decision D17).
 */
export function openDb({ url, authToken }: DbConfig): Db {
  if (url.startsWith('file:')) mkdirSync(dirname(url.slice('file:'.length)), { recursive: true });
  return createClient({ url, authToken, timeout: 5_000 });
}
