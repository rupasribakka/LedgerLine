import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    hookTimeout: 40000,
    testTimeout: 40000,
  },
});
