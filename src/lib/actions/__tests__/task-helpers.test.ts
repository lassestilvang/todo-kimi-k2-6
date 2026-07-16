import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

// Mock the validation module
vi.mock('@/lib/validation', () => ({
  sanitizeString: vi.fn(s => s),
}));

describe('task-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock to simulate server environment
    delete (global as any).window;
  });

  describe('logTaskAction', () => {
    it('should return early when window is defined (browser environment)', async () => {
      // Mock browser environment
      (global as any).window = {};

      const { logTaskAction } = await import('../task-helpers');
      const result = await logTaskAction(1, 'created', 'Test log');

      // Should return early without executing
      expect(result).toBeUndefined();
    });

    it('should be a function', async () => {
      const { logTaskAction } = await import('../task-helpers');
      expect(typeof logTaskAction).toBe('function');
    });
  });
});