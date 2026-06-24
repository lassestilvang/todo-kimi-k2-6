/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/.jest/setup-tests.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testMatch: ['**/*.spec.(ts|tsx)', '**/*.test.(ts|tsx)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/src/lib/',  // Ignore src/lib directory (that's for bun:test)
    '/src/types/',  // Ignore src/types (that's for bun:test)
    '/.e2e/',  // Ignore e2e tests (that's for Playwright)
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Handle node_modules that need to be transformed
  transformIgnorePatterns: [
    'node_modules/(?!(your-esm-module)/)',
  ],
};

module.exports = config;