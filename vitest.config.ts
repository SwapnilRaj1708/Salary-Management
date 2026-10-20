import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['shared', 'api', 'web'],
    coverage: {
      provider: 'v8',
      include: ['shared/src/**', 'api/src/**', 'web/src/**'],
      // Entry points only wire things together; booting them is checked by CI's
      // Docker smoke test, not by unit tests.
      exclude: ['**/*.test.{ts,tsx}', '**/test/**', 'api/src/main.ts', 'web/src/main.tsx'],
    },
  },
});
