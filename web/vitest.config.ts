import react from '@vitejs/plugin-react';
import { defineProject } from 'vitest/config';

export default defineProject({
  plugins: [react()],
  test: {
    name: 'web',
    environment: 'jsdom',
    // The MUI X Data Grid renders slowly in jsdom; a cold first render can take ~3 s.
    testTimeout: 15_000,
    setupFiles: ['./src/test/setup.ts'],
    env: { TZ: 'UTC' },
  },
});
