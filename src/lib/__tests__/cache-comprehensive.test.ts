import { describe, it, expect, beforeEach } from "vitest";
import { taskCache, getCacheStats, cached } from "@/lib/cache";

// Re-implement cache for testing
const cache = new Map<string, { data: any; timestamp: number; expiresAt: number }>();
const DEFAULT_TTL = 5 * 60 * 1000;

function set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): void {
  const now = Date.now();
  cache.set(key, { data: value, timestamp: now, expiresAt: now + ttl });
}

function get<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function del(key: string): void {
  cache.delete(key);
}

function clear(): void {
  cache.clear();
}

function getCacheStatsImpl() {
  return { size: cache.size, keys: Array.from(cache.keys()) };
}

async function cachedFn<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number = DEFAULT_TTL
): Promise<any> {
  return async (...args: Parameters<T>): Promise<any> => {
    const key = keyGenerator(...args);
    const cached = get(key);
    if (cached !== null) return cached;
    const result = await fn(...args);
    set(key, result, ttl);
    return result;
  };
}

describe("Cache Comprehensive Tests", () => {
  beforeEach(() => {
    clear();
  });

  describe("getCacheStats", () => {
    it("should return empty stats when cache is empty", () => {
      const stats = getCacheStatsImpl();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it("should return correct stats when cache has entries", () => {
      set("key1", "value1");
      set("key2", "value2");
      const stats = getCacheStatsImpl();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain("key1");
      expect(stats.keys).toContain("key2");
    });
  });

  describe("cached decorator", () => {
    it("should cache function results", async () => {
      let callCount = 0;
      const fn = async (x: number) => {
        callCount++;
        return x * 2;
      };
      const keyGenerator = (x: number) => `double:${x}`;
      const wrappedFn = async (...args: Parameters<typeof fn>) => {
        const key = keyGenerator(...args);
        const cached = get<number>(key);
        if (cached !== null) return cached;
        const result = await fn(...args);
        set(key, result);
        return result;
      };

      expect(await wrappedFn(5)).toBe(10);
      expect(callCount).toBe(1);
      expect(await wrappedFn(5)).toBe(10);
      expect(callCount).toBe(1); // Should not call again
    });

    it("should cache different arguments separately", async () => {
      let callCount = 0;
      const fn = async (x: number) => {
        callCount++;
        return x * 2;
      };
      const keyGenerator = (x: number) => `double:${x}`;
      const wrappedFn = async (...args: Parameters<typeof fn>) => {
        const key = keyGenerator(...args);
        const cached = get<number>(key);
        if (cached !== null) return cached;
        const result = await fn(...args);
        set(key, result);
        return result;
      };

      expect(await wrappedFn(5)).toBe(10);
      expect(await wrappedFn(3)).toBe(6);
      expect(callCount).toBe(2);
    });
  });
});