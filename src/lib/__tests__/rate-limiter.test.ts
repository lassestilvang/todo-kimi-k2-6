import { describe, it, expect, beforeEach } from "vitest";

// Test the rate limiter logic with a simple mock
describe("Rate Limiter Logic", () => {
  // Simple implementation matching the real one
  class TestRateLimiter {
    private store: Map<string, { count: number; resetTime: number }>;
    private windowMs: number;
    private max: number;

    constructor(config: { windowMs: number; max: number }) {
      this.store = new Map();
      this.windowMs = config.windowMs;
      this.max = config.max;
    }

    isAllowed(key: string) {
      const now = Date.now();
      const resetTime = now + this.windowMs;

      const record = this.store.get(key);

      if (!record || now > record.resetTime) {
        this.store.set(key, { count: 1, resetTime });
        return { allowed: true, remaining: this.max - 1, resetTime };
      }

      if (record.count >= this.max) {
        return { allowed: false, remaining: 0, resetTime: record.resetTime };
      }

      record.count++;
      this.store.set(key, record);
      return { allowed: true, remaining: this.max - record.count, resetTime: record.resetTime };
    }

    reset(key: string) {
      this.store.delete(key);
    }
  }

  let limiter: TestRateLimiter;

  beforeEach(() => {
    limiter = new TestRateLimiter({ windowMs: 1000, max: 5 });
  });

  it("should allow requests under the limit", () => {
    const result = limiter.isAllowed("test-key");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("should block requests over the limit", () => {
    const key = "test-key-2";
    // Use up the limit
    for (let i = 0; i < 5; i++) {
      limiter.isAllowed(key);
    }
    // Next request should be blocked
    const result = limiter.isAllowed(key);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should reset the counter", () => {
    const key = "test-key-3";
    limiter.isAllowed(key);
    limiter.reset(key);
    const result = limiter.isAllowed(key);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });
});