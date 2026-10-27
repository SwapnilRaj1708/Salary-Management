import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.ts';

describe('loadConfig', () => {
  it('defaults to port 3000, version "dev", a local database file and the demo login', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      version: 'dev',
      database: { url: 'file:data/local.db', authToken: undefined },
      admin: { email: 'admin@acme.example', password: 'local-demo-password' },
      cookieSecure: false,
      timeZone: 'Asia/Kolkata',
    });
  });

  it('reads the time zone that decides "today" from APP_TIME_ZONE', () => {
    expect(loadConfig({ APP_TIME_ZONE: 'Europe/London' }).timeZone).toBe('Europe/London');
  });

  it('refuses to start with a time zone it does not know', () => {
    expect(() => loadConfig({ APP_TIME_ZONE: 'Mars/Olympus_Mons' })).toThrow(/APP_TIME_ZONE/);
  });

  it('reads the HR login from ADMIN_EMAIL and ADMIN_PASSWORD', () => {
    expect(loadConfig({ ADMIN_EMAIL: 'hr@acme.example', ADMIN_PASSWORD: 's3cret' }).admin).toEqual({
      email: 'hr@acme.example',
      password: 's3cret',
    });
  });

  it('refuses to start on a Vercel deployment without the HR login', () => {
    const env = { VERCEL_ENV: 'production', TURSO_DATABASE_URL: 'libsql://db.turso.io' };

    expect(() => loadConfig(env)).toThrow(/ADMIN_EMAIL/);
    expect(() => loadConfig({ ...env, ADMIN_EMAIL: 'a@b.c' })).toThrow(/ADMIN_PASSWORD/);
  });

  it('marks the session cookie Secure on Vercel deployments, which are always HTTPS', () => {
    const env = {
      VERCEL_ENV: 'preview',
      TURSO_DATABASE_URL: 'libsql://db.turso.io',
      ADMIN_EMAIL: 'a@b.c',
      ADMIN_PASSWORD: 'x',
    };

    expect(loadConfig(env).cookieSecure).toBe(true);
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
      expect(() =>
        loadConfig({ VERCEL_ENV: vercelEnv, ADMIN_EMAIL: 'a@b.c', ADMIN_PASSWORD: 'x' }),
      ).toThrow(/TURSO_DATABASE_URL/);
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
