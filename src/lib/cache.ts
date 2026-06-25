/**
 * Simple in-memory cache for task data
 * Can be extended with Redis in production
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): void {
  const now = Date.now();
  cache.set(key, {
    data: value,
    timestamp: now,
    expiresAt: now + ttl,
  });
}

export function get<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function del(key: string): void {
  cache.delete(key);
}

export function clear(): void {
  cache.clear();
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

/**
 * Cache for task-related data
 */
export const taskCache = {
  tasks: {
    key: (filters: string) => `tasks:${filters}`,
    set: (filters: string, data: any, ttl?: number) => set(`tasks:${filters}`, data, ttl),
    get: (filters: string) => get<any>(`tasks:${filters}`),
  },
  lists: {
    key: () => "lists",
    set: (data: any, ttl?: number) => set("lists", data, ttl),
    get: () => get<any>("lists"),
  },
  labels: {
    key: () => "labels",
    set: (data: any, ttl?: number) => set("labels", data, ttl),
    get: () => get<any>("labels"),
  },
};