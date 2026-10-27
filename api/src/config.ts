import { z } from 'zod';
import type { DbConfig } from './db/client.ts';

// Vercel and `vercel env pull` can set a variable to an empty string; that counts as unset.
const optional = z
  .string()
  .optional()
  .transform((value) => value || undefined);

const Env = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  // Vercel sets this to the deployed commit. Locally it is unset.
  VERCEL_GIT_COMMIT_SHA: optional,
  // Set by Vercel on every deployment: production, preview or development.
  VERCEL_ENV: optional,
  TURSO_DATABASE_URL: optional,
  TURSO_AUTH_TOKEN: optional,
  ADMIN_EMAIL: optional,
  ADMIN_PASSWORD: optional,
});

export type Config = {
  port: number;
  version: string;
  database: DbConfig;
  admin: { email: string; password: string };
  cookieSecure: boolean;
  timeZone?: string;
};

/** Without a configured database, local runs use this file (relative to the api folder). */
const LOCAL_DATABASE_URL = 'file:data/local.db';

/** Without a configured HR login, local runs use this local-only one (README). */
const LOCAL_ADMIN = { email: 'admin@acme.example', password: 'local-demo-password' };

/** Reads and validates the environment once at boot. Invalid config stops the process. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = Env.parse(env);
  const deployed = parsed.VERCEL_ENV === 'production' || parsed.VERCEL_ENV === 'preview';
  if (deployed && !parsed.TURSO_DATABASE_URL) {
    // A function's disk doesn't last, so a deployment without Turso would lose its data.
    throw new Error(`TURSO_DATABASE_URL must be set on a Vercel ${parsed.VERCEL_ENV} deployment`);
  }
  for (const name of ['ADMIN_EMAIL', 'ADMIN_PASSWORD'] as const) {
    if (deployed && !parsed[name]) {
      throw new Error(`${name} must be set on a Vercel ${parsed.VERCEL_ENV} deployment`);
    }
  }
  return {
    port: parsed.PORT,
    version: parsed.VERCEL_GIT_COMMIT_SHA ?? 'dev',
    database: {
      url: parsed.TURSO_DATABASE_URL ?? LOCAL_DATABASE_URL,
      authToken: parsed.TURSO_AUTH_TOKEN,
    },
    admin: {
      email: parsed.ADMIN_EMAIL ?? LOCAL_ADMIN.email,
      password: parsed.ADMIN_PASSWORD ?? LOCAL_ADMIN.password,
    },
    // Vercel deployments are always HTTPS; local runs and tests are plain http.
    cookieSecure: deployed,
  };
}
