import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    fileParallelism: false,
    poolOptions: {
      threads: {
        singleThread: true,
      },
      forks: {
        singleFork: true,
      },
    },
    hookTimeout: 40000,
    testTimeout: 40000,
  },
});
