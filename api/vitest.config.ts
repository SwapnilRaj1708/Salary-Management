import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'api',
    environment: 'node',
    // Code that opens the configured database (the Vercel entry) gets a throwaway one.
    env: { TZ: 'UTC', TURSO_DATABASE_URL: ':memory:' },
  },
});
