import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['shared', 'api', 'web'],
    coverage: {
      provider: 'v8',
      include: ['shared/src/**', 'api/src/**', 'web/src/**'],
      // Entry points only wire things together. The docker-smoke CI job (slice S2) will
      // boot them; unit tests don't.
      exclude: ['**/*.test.{ts,tsx}', '**/test/**', 'api/src/main.ts', 'web/src/main.tsx'],
    },
  },
});
