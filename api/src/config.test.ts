import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.ts';

describe('loadConfig', () => {
  it('defaults to port 3000 and version "dev" when nothing is set', () => {
    expect(loadConfig({})).toEqual({ port: 3000, version: 'dev' });
  });

  it('reads the port and the deployed commit from the environment', () => {
    expect(loadConfig({ PORT: '8080', VERCEL_GIT_COMMIT_SHA: 'abc1234' })).toEqual({
      port: 8080,
      version: 'abc1234',
    });
  });

  it('rejects a port that is not a valid number', () => {
    expect(() => loadConfig({ PORT: 'eighty' })).toThrow();
  });
});
