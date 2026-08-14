# Testing Guide

## Quick Start

```bash
# Run all unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch

# Run E2E tests (requires server running)
npm run build && npm start &
npx playwright test

# Run mutation testing (takes several minutes)
npx stryker run
```

## Test Structure

```
src/
├── __tests__/              # General unit tests
│   ├── validation-*.test.ts     # Zod schema tests
│   ├── error-handling-*.test.ts # Error handling tests
│   ├── api-*.test.ts           # API middleware tests
│   └── ...
├── app/api/__tests__/      # API route integration tests
├── components/**/__tests__/ # Component tests
├── hooks/__tests__/        # Hook tests
├── lib/**/__tests__/       # Library tests
├── actions/__tests__/      # Server action tests
└── ai/__tests__/           # AI integration tests

e2e/                        # End-to-end tests (Playwright)
├── *.spec.ts
```

## Coverage Requirements

| Metric     | Threshold |
| ---------- | --------- |
| Statements | 80%       |
| Branches   | 65%       |
| Functions  | 78%       |
| Lines      | 80%       |

## Writing Tests

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature Under Test', () => {
  it('should handle valid input', () => {
    expect(result).toBeDefined();
  });

  it('should reject invalid input', () => {
    expect(() => fn()).toThrow();
  });
});
```

### API Route Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb } from '@/lib/db/test-db';
import { setDb, resetDb } from '@/lib/db';

describe('API Route Tests', () => {
  beforeEach(() => {
    resetDb();
    setDb(createTestDb());
  });

  afterEach(() => {
    resetDb();
  });

  // Tests here
});
```

## CI/CD Integration

Tests run automatically on:

- Every push to main branch
- Every pull request
- On merge to main

See `.github/workflows/test.yaml` for full configuration.

## Test Debugging

```bash
# Debug specific test file
npm run test -- src/lib/__tests__/validation.test.ts

# Debug with Vitest UI
npm run dev:test

# Skip slow tests
npm run test -- --exclude='**/*slow*.test.ts'
```
