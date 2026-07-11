import { config } from "./config";

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

/**
 * Rate Limiter interface - supports both in-memory and Redis backends
 */
interface RateLimiterBackend {
  isAllowed(key: string, limitConfig: RateLimitConfig): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

/**
 * Database-backed rate limiter for persistence across restarts
 * Note: Currently not used due to circular dependency with db module
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class DatabaseRateLimiter implements RateLimiterBackend {
  private db: ReturnType<typeof import("./db").getDb>;

  constructor(db: ReturnType<typeof import("./db").getDb>) {
    this.db = db;
  }

  async isAllowed(key: string, limitConfig: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const resetTime = now + limitConfig.windowMs;

    // Try to insert or update the rate limit record
    try {
      const stmt = this.db.prepare(`
        INSERT INTO rate_limit_log (key, count, reset_time)
        VALUES (?, 1, ?)
        ON CONFLICT(key)
        DO UPDATE SET
          count = CASE WHEN reset_time > ? THEN count + 1 ELSE 1 END,
          reset_time = CASE WHEN reset_time > ? THEN reset_time ELSE ? END
      `);

      const result = stmt.run(key, resetTime, now, now, resetTime);
      const newCount = result.changes > 0 ?
        (this.db.prepare("SELECT count FROM rate_limit_log WHERE key = ?").get(key)?.count || 1) : 1;

      const allowed = newCount <= limitConfig.max;
      const currentCount = allowed ? newCount : limitConfig.max;

      return {
        allowed,
        remaining: Math.max(0, limitConfig.max - currentCount),
        resetTime: resetTime,
        limit: limitConfig.max,
      };
    } catch (error) {
      console.error("Database rate limiter error:", error);
      // Fall back to allowing the request
      return { allowed: true, remaining: limitConfig.max, resetTime, limit: limitConfig.max };
    }
  }

  async reset(key: string): Promise<void> {
    this.db.prepare("DELETE FROM rate_limit_log WHERE key = ?").run(key);
  }
}

/**
 * In-memory rate limiter (for development/testing)
 */
class MemoryRateLimiter implements RateLimiterBackend {
  private store: Map<string, { count: number; resetTime: number }>;

  constructor() {
    this.store = new Map();

    // Cleanup expired entries periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (now > value.resetTime) {
          this.store.delete(key);
        }
      }
    }, 60000);
  }

  async isAllowed(key: string, limitConfig: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const resetTime = now + limitConfig.windowMs;

    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      this.store.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: limitConfig.max - 1, resetTime, limit: limitConfig.max };
    }

    if (record.count >= limitConfig.max) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime, limit: limitConfig.max };
    }

    record.count++;
    this.store.set(key, record);
    return { allowed: true, remaining: limitConfig.max - record.count, resetTime, limit: limitConfig.max };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * Redis-based rate limiter (for production)
 */
class RedisRateLimiter implements RateLimiterBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Redis type is complex
  private redis: any;

  constructor(redisUrl?: string) {
    if (redisUrl) {
      try {
        // Dynamic import to avoid issues if Redis isn't configured
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Redis = require("ioredis");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.redis = new Redis(redisUrl) as any;
      } catch {
        // Fall back to memory if Redis unavailable
        console.warn("Redis not available, falling back to in-memory rate limiting");
      }
    }
  }

  async isAllowed(key: string, limitConfig: RateLimitConfig): Promise<RateLimitResult> {
    if (!this.redis) {
      // Fall back to memory
      return new MemoryRateLimiter().isAllowed(key, limitConfig);
    }

    try {
      const resetTime = Date.now() + limitConfig.windowMs;
      const redisKey = `rate_limit:${key}`;

      const multi = this.redis.multi();
      multi.incr(redisKey);
      multi.ttl(redisKey);
      multi.expireat(redisKey, Math.floor(resetTime / 1000));

      const results = await multi.exec();
      const count = results?.[0]?.[1] as number;
      const ttl = results?.[1]?.[1] as number;

      const allowed = count <= limitConfig.max;
      const remaining = Math.max(0, limitConfig.max - count);

      return {
        allowed,
        remaining,
        resetTime: ttl ? Date.now() + ttl * 1000 : resetTime,
        limit: limitConfig.max,
      };
    } catch (error) {
      console.error("Redis rate limiter error:", error);
      const resetTime = Date.now() + limitConfig.windowMs;
      return { allowed: true, remaining: limitConfig.max, resetTime, limit: limitConfig.max };
    }
  }

  async reset(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(`rate_limit:${key}`);
    }
  }
}

// Select backend based on configuration
// Priority: Redis > Database > Memory
function initBackend(): RateLimiterBackend {
  if (config.redis.url) {
    return new RedisRateLimiter(config.redis.url);
  }
  // Use memory backend as fallback (database backend has circular dependency issues)
  return new MemoryRateLimiter();
}

const backend: RateLimiterBackend = initBackend();

// Named rate limiters for different endpoint types
export const rateLimits = {
  api: { windowMs: 60 * 1000, max: 100 },
  auth: { windowMs: 15 * 60 * 1000, max: 10 },
  ai: { windowMs: 60 * 1000, max: 20 },
  strict: { windowMs: 60 * 1000, max: 30 },
};

/**
 * Check if a request is allowed based on rate limits
 */
export async function checkRateLimit(
  key: string,
  limitConfig: RateLimitConfig
): Promise<RateLimitResult> {
  return backend.isAllowed(key, limitConfig);
}

/**
 * Get a client identification key from the request
 * Handles various proxy headers for accurate client identification
 */
export function getClientKey(request: Request): string {
  // Try X-Forwarded-For first (standard proxy header)
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  // Fall back to X-Real-IP (used by some proxies)
  const realIp = request.headers.get("x-real-ip");

  // Use the first available IP
  const ip = forwardedFor || realIp || "127.0.0.1";

  // Combine with user ID if available (for authenticated users)
  const userId = request.headers.get("x-user-id") || "anonymous";

  return `${ip}:${userId}`;
}

/**
 * Get just the IP address from the request
 */
export function getClientIp(request: Request): string {
  return getClientKey(request).split(":")[0];
}

/**
 * Middleware helper for API routes
 */
export async function withRateLimit(
  request: Request,
  limitConfig: RateLimitConfig
): Promise<{ allowed: boolean; response?: Response }> {
  const key = getClientKey(request);
  const result = await checkRateLimit(key, limitConfig);

  if (!result.allowed) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: "Too many requests",
          code: "RATE_LIMITED",
          resetTime: result.resetTime,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          },
        }
      ),
    };
  }

  return { allowed: true };
}