// Setup for vitest/jest environment
import '@testing-library/jest-dom';
import { createMockDatabase } from '@/lib/db/mock-driver';
import { vi } from 'vitest';

// Mock window.matchMedia for use-mobile tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('max-width'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  value: 1024,
});

// Mock better-sqlite3 for tests - use mock driver
vi.mock('better-sqlite3', () => {
  return {
    __esModule: true,
    default: () => createMockDatabase(),
  };
});