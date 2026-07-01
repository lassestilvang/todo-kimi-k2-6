/**
 * Caching layer for TaskFlow.
 *
 * Supports both in-memory (development) and Redis (production) caching.
 * To enable Redis, set the REDIS_URL environment variable.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// In-memory cache (used when Redis is not configured)
const memoryCache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

// Redis client (will be initialized if REDIS_URL is set)
let redis: any = null;

/**
 * Initialize Redis client if configured.
 */
async function initRedis() {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  try {
    // Dynamic import to avoid bundling redis in client builds
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const redisModule = require("redis");
    redis = redisModule.createClient({ url: redisUrl });
    redis.on("error", (err: Error) => console.error("Redis error:", err));
    await redis.connect();
    return redis;
  } catch (error) {
    console.warn("Failed to connect to Redis, falling back to memory cache:", error);
    return null;
  }
}

/**
 * Set a value in the cache.
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time to live in milliseconds
 */
export async function set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
  const serialized = JSON.stringify(value);
  const now = Date.now();

  // Try Redis first
  const redisClient = await initRedis();
  if (redisClient) {
    await redisClient.setEx(key, Math.ceil(ttl / 1000), serialized);
    return;
  }

  // Fall back to memory cache
  memoryCache.set(key, {
    data: value,
    timestamp: now,
    expiresAt: now + ttl,
  });
}

/**
 * Get a value from the cache.
 * @param key - Cache key
 * @returns The cached value or null if not found/expired
 */
export async function get<T>(key: string): Promise<T | null> {
  // Try Redis first
  const redisClient = await initRedis();
  if (redisClient) {
    const serialized = await redisClient.get(key);
    if (!serialized) return null;
    try {
      return JSON.parse(serialized) as T;
    } catch {
      return null;
    }
  }

  // Fall back to memory cache
  const entry = memoryCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Delete a value from the cache.
 * @param key - Cache key
 */
export async function del(key: string): Promise<void> {
  // Try Redis first
  const redisClient = await initRedis();
  if (redisClient) {
    await redisClient.del(key);
    return;
  }

  // Fall back to memory cache
  memoryCache.delete(key);
}

/**
 * Clear all cached values.
 */
export async function clear(): Promise<void> {
  // Try Redis first
  const redisClient = await initRedis();
  if (redisClient) {
    await redisClient.flushAll();
    return;
  }

  // Fall back to memory cache
  memoryCache.clear();
}

/**
 * Get cache statistics (memory cache only).
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: memoryCache.size,
    keys: Array.from(memoryCache.keys()),
  };
}

/**
 * Task-specific cache with helper methods.
 */
export const taskCache = {
  tasks: {
    key: (filters: string) => `tasks:${filters}`,
    set: async (filters: string, data: any, ttl?: number) => {
      await set(`tasks:${filters}`, data, ttl);
    },
    get: async (filters: string) => await get<any>(`tasks:${filters}`),
    invalidate: async () => {
      // Invalidate all task-related cache keys
      const redisClient = await initRedis();
      if (redisClient) {
        const keys = await redisClient.keys("tasks:*");
        if (keys.length > 0) await redisClient.del(...keys);
      } else {
        for (const key of memoryCache.keys()) {
          if (key.startsWith("tasks:")) memoryCache.delete(key);
        }
      }
    },
  },
  lists: {
    key: () => "lists",
    set: async (data: any, ttl?: number) => await set("lists", data, ttl),
    get: async () => await get<any>("lists"),
    invalidate: async () => await del("lists"),
  },
  labels: {
    key: () => "labels",
    set: async (data: any, ttl?: number) => await set("labels", data, ttl),
    get: async () => await get<any>("labels"),
    invalidate: async () => await del("labels"),
  },
};

// Cache decorator for async functions
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number = DEFAULT_TTL
): T {
  return (async (...args: Parameters<T>): Promise<any> => {
    const key = keyGenerator(...args);
    const cached = await get<ReturnType<T>>(key);
    if (cached !== null) return cached;

    const result = await fn(...args);
    await set(key, result, ttl);
    return result;
  }) as T;
}