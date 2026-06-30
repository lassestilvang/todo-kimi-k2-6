export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
}

// Simple in-memory rate limiter
// For production, use Redis or similar
class RateLimiter {
  private store: Map<string, { count: number; resetTime: number }>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.store = new Map();
    this.config = config;

    // Cleanup expired entries periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (now > value.resetTime) {
          this.store.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  isAllowed(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // New window
      this.store.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: this.config.max - 1, resetTime };
    }

    if (record.count >= this.config.max) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    // Increment counter
    record.count++;
    this.store.set(key, record);
    return { allowed: true, remaining: this.config.max - record.count, resetTime: record.resetTime };
  }

  reset(key: string): void {
    this.store.delete(key);
  }
}

// Different rate limit configs for different endpoints
export const rateLimits = {
  api: new RateLimiter({ windowMs: 60 * 1000, max: 100 }), // 100 req/min
  auth: new RateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 req/15min
  ai: new RateLimiter({ windowMs: 60 * 1000, max: 20 }), // 20 req/min
  strict: new RateLimiter({ windowMs: 60 * 1000, max: 30 }), // 30 req/min
};

// Middleware helper
export function getClientKey(request: Request): string {
  // Get IP from headers (X-Forwarded-For for proxied requests)
  const headers = new Headers();
  const ip = headers.get("x-forwarded-for") || "127.0.0.1";
  const userId = headers.get("x-user-id") || "anonymous";
  return `${ip}:${userId}`;
}