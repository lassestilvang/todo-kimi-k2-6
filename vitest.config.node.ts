import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/*': resolve(__dirname, './src/*'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/lib/db/__tests__/driver.test.ts',
      'src/lib/db/__tests__/index.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'src/types/**',
      ],
      thresholds: {
        branches: 80,
        functions: 85,
        lines: 85,
        statements: 85,
      },
    },
    clearMocks: true,
    restoreWorkers: true,
  },
});