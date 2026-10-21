import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.ts';

describe('loadConfig', () => {
  it('defaults to port 3000, version "dev" and a local database file when nothing is set', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      version: 'dev',
      database: { url: 'file:data/local.db', authToken: undefined },
    });
  });

  it('reads the port and the deployed commit from the environment', () => {
    expect(loadConfig({ PORT: '8080', VERCEL_GIT_COMMIT_SHA: 'abc1234' })).toMatchObject({
      port: 8080,
      version: 'abc1234',
    });
  });

  it('reads the Turso database URL and auth token', () => {
    const env = {
      TURSO_DATABASE_URL: 'libsql://salary-preview.turso.io',
      TURSO_AUTH_TOKEN: 'secret-token',
    };

    expect(loadConfig(env).database).toEqual({
      url: 'libsql://salary-preview.turso.io',
      authToken: 'secret-token',
    });
  });

  it('treats empty database variables as unset', () => {
    expect(loadConfig({ TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '' }).database).toEqual({
      url: 'file:data/local.db',
      authToken: undefined,
    });
  });

  it.each(['production', 'preview'])(
    'refuses to start on a Vercel %s deployment without a database URL',
    (vercelEnv) => {
      expect(() => loadConfig({ VERCEL_ENV: vercelEnv })).toThrow(/TURSO_DATABASE_URL/);
    },
  );

  it('falls back to version "dev" when the commit variable is set but empty', () => {
    // `vercel env pull` writes VERCEL_GIT_COMMIT_SHA="" for local development.
    expect(loadConfig({ VERCEL_GIT_COMMIT_SHA: '' }).version).toBe('dev');
  });

  it('rejects a port that is not a valid number', () => {
    expect(() => loadConfig({ PORT: 'eighty' })).toThrow();
  });
});
