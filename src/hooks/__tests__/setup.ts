// Setup for vitest/jest environment
import '@testing-library/jest-dom';
import { createMockDatabase } from '@/lib/db/mock-driver';
import { vi } from 'vitest';

// Mock localStorage for React hooks that use it
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
});

// Mock window.matchMedia for use-mobile tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('max-width'),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
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
