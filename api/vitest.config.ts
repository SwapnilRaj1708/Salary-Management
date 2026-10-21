import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'api',
    environment: 'node',
    env: { TZ: 'UTC' },
  },
});
