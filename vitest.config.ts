import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['shared', 'api', 'web'],
    coverage: {
      provider: 'v8',
      include: ['shared/src/**', 'api/src/**', 'web/src/**'],
      exclude: ['**/*.test.{ts,tsx}', '**/test/**'],
    },
  },
});
