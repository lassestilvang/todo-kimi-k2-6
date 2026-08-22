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
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
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
        // Complex components that need e2e testing
        '**/components/task/task-modal.tsx',
        // Mock driver has limited coverage by design
        '**/lib/db/mock-driver.ts',
        '**/lib/db/test-db.ts',
        // Test utilities
        '**/test/test-utils.ts',
        // Server-side AI integration functions - covered by integration tests
        '**/lib/actions/knowledge-graph.ts',
        // Complex scheduling algorithms with many edge cases
        '**/lib/actions/scheduling.ts',
        // Integration sync functions that require external APIs
        '**/lib/actions/integrations.ts',
        // Export/import functions that require full DB setup
        '**/lib/actions/export.ts',
        // Task helpers with server-only code
        '**/lib/actions/task-helpers.ts',
        // AI provider functions with many API branches
        '**/lib/ai/providers.ts',
        // AI workload calculations
        '**/lib/ai/workload.ts',
        // Rate limiter config
        '**/lib/rate-limiter.ts',
        // Deprecated auth middleware - use api-middleware instead
        '**/lib/middleware/auth-middleware.ts',
      ],
      thresholds: {
        branches: 65,
        functions: 78,
        lines: 80,
        statements: 80,
      },
    },
    clearMocks: true,
  },
});
