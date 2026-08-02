import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['server/utils/**', 'server/middleware/**'],
    },
  },
});
