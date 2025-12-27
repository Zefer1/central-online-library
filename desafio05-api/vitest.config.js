import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    minThreads: 1,
    maxThreads: 1,
    isolate: true,
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    setupFiles: ['./test/setup.js'],
  },
});
