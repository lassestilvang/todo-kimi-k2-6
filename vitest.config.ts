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
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
    exclude: [
      // Performance tests - these need real DB for accurate metrics
      '**/performance.test.ts',
      // E2E and spec tests
      '**/*.spec.ts',
      '**/*.spec.tsx',
      // Integration tests that need full environment
      '**/app/api/__tests__/integration.test.ts',
      '**/app/api/tasks/__tests__/route.test.ts',
      '**/app/api/templates/__tests__/route.test.ts',
      // Database driver tests require Node 20+ with compiled native modules
      // Run separately with: npx vitest -c vitest.config.node.ts
      '**/lib/db/driver.test.ts',
      '**/lib/db/index.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'src/types/**',
        // These files contain native SQLite driver code or are auto-generated
        '**/lib/db/driver.ts',
        '**/lib/db/index.ts',
        '**/lib/db/migrations.ts',
        '**/vitest.config.node.ts',
        // Auth config requires real NextAuth setup - covered by integration tests
        '**/app/api/auth/[...nextauth]/config.ts',
        // Complex components that need e2e testing
        '**/components/task/task-modal.tsx',
        '**/components/task/pomodoro-timer.tsx',
        '**/components/task/gantt-calendar.tsx',
      ],
      thresholds: {
        branches: 55,
        functions: 60,
        lines: 65,
        statements: 65,
      },
    },
    clearMocks: true,
    restoreWorkers: true,
  },
});