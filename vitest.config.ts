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
      // Tests requiring SQLite native binding
      '**/db/**',
      '**/actions/**/__tests__/**',
      '**/actions/**/*.test.ts',
      '**/performance.test.ts',
      '**/cache.test.ts',
      '**/utils.test.ts',
      '**/api/**/__tests__/**',
      '**/api/labels/__tests__/**',
      '**/api/lists/__tests__/**',
      '**/api/templates/__tests__/**',
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
        branches: 70,
        functions: 85,
        lines: 90,
        statements: 88,
      },
    },
  },
});