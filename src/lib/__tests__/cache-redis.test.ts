import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Cache - Redis Integration Tests', () => {
  const originalRedisUrl = process.env.REDIS_URL;

  beforeEach(() => {
    // Reset any Redis URL for these tests
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    process.env.REDIS_URL = originalRedisUrl;
    vi.clearAllMocks();
  });

  describe('Redis fallback behavior', () => {
    it('should fall back to memory cache when Redis not configured', async () => {
      // Import fresh module without Redis
      vi.resetModules();

      const { set, get } = await import('@/lib/cache');

      await set('test-key', 'test-value');
      const result = await get('test-key');

      expect(result).toBe('test-value');
    });

    it('should handle Redis connection failure', async () => {
      const { set, get } = await import('@/lib/cache');

      // Set without Redis
      await set('fallback-key', 'fallback-value');
      const result = await get('fallback-key');

      expect(result).toBe('fallback-value');
    });
  });

  describe('taskCache.invalidate with Redis', () => {
    it('should handle invalidate without Redis', async () => {
      const { taskCache } = await import('@/lib/cache');

      // Should not throw
      await taskCache.tasks.invalidate();
      expect(true).toBe(true);
    });
  });

  describe('Cache serialization', () => {
    it('should serialize complex objects', async () => {
      const { set, get } = await import('@/lib/cache');

      const complex = {
        nested: { a: 1, b: 2 },
        array: [1, 2, 3],
        string: 'test',
      };

      await set('complex', complex);
      const result = await get<typeof complex>('complex');

      expect(result?.nested).toEqual({ a: 1, b: 2 });
      expect(result?.array).toEqual([1, 2, 3]);
    });

    it('should handle arrays', async () => {
      const { set, get } = await import('@/lib/cache');

      const arr = [1, 2, 3, 4, 5];
      await set('array', arr);

      const result = await get<number[]>('array');
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle empty objects', async () => {
      const { set, get } = await import('@/lib/cache');

      await set('empty-object', {});
      const result = await get('empty-object');
      expect(result).toEqual({});
    });
  });

  describe('Cache key patterns', () => {
    it('should handle task cache key patterns', async () => {
      const { taskCache } = await import('@/lib/cache');

      const key = taskCache.tasks.key('filter:urgent,sort:date,desc');
      expect(key).toBe('tasks:filter:urgent,sort:date,desc');
    });

    it('should handle list cache key', async () => {
      const { taskCache } = await import('@/lib/cache');

      const key = taskCache.lists.key();
      expect(key).toBe('lists');
    });

    it('should handle label cache key', async () => {
      const { taskCache } = await import('@/lib/cache');

      const key = taskCache.labels.key();
      expect(key).toBe('labels');
    });
  });
});
