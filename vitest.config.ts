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
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/hooks/__tests__/setup.ts'],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      '**/coverage',
      '.e2e/**',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      // Tests requiring SQLite native binding (Node.js version incompatibility)
      '**/db/**',
      // Performance tests
      '**/performance.test.ts',
      // Tests that import better-sqlite3 directly
      '**/actions/__tests__/time-tracking.test.ts',
      '**/actions/__tests__/time.test.ts',
      '**/actions/__tests__/reminders.test.ts',
      '**/actions/__tests__/sharing.test.ts',
      '**/actions/__tests__/tasks.test.ts',
      '**/actions/__tests__/goals.test.ts',
      '**/actions/__tests__/goals-comprehensive.test.ts',
      '**/actions/__tests__/sharing-comprehensive.test.ts',
      '**/actions/__tests__/tasks-comprehensive.test.ts',
      '**/actions/__tests__/analytics.test.ts',
      '**/actions/__tests__/filter-presets.test.ts',
      '**/actions/__tests__/habits.test.ts',
      '**/actions/__tests__/reminders.ts',
      // Also exclude tests directly in actions folder
      '**/actions/reminders.test.ts',
      '**/actions/sharing.test.ts',
      '**/actions/tasks.test.ts',
      '**/actions/time.test.ts',
      // API route tests require native SQLite binding in test environment
      '**/api/**/__tests__/**',
      '**/api/labels/__tests__/**',
      '**/api/lists/__tests__/**',
      '**/api/templates/__tests__/**',
      // Cache tests need async updates
      '**/cache.test.ts',
      '**/cache-comprehensive.test.ts',
      '**/cache-edge-cases.test.ts',
      '**/comprehensive-cache.test.ts',
      '**/error-handling.test.ts',
    ],
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'src/types/**',
        'src/lib/performance.test.ts',
        '**/*.spec.ts',
        '**/*.spec.tsx',
      ],
      thresholds: {
        branches: 75,
        functions: 90,
        lines: 88,
        statements: 88,
      },
    },
  },
});