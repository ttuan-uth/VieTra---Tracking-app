import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'server/**/*.test.ts'],
    pool: 'threads',
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})
