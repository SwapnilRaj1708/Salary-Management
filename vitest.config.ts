import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['shared', 'api', 'web'],
    coverage: {
      provider: 'v8',
      include: ['shared/src/**', 'api/src/**', 'web/src/**'],
      // Entry points only wire things together. The deploy-smoke CI job boots
      // api/src/main.ts, and the web build compiles web/src/main.tsx.
      // (api/src/vercel.ts is small enough to have its own test.)
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/test/**',
        'api/src/main.ts',
        'api/src/seed/cli.ts',
        'web/src/main.tsx',
      ],
    },
  },
});
