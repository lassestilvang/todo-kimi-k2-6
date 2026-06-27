// Setup for vitest/jsdom environment
import '@testing-library/jest-dom';

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