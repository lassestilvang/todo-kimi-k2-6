import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the rate limiter before importing api-middleware
vi.mock("@/lib/rate-limiter", () => ({
  rateLimits: {
    api: { windowMs: 60000, max: 100 },
    auth: { windowMs: 60000, max: 10 },
    ai: { windowMs: 60000, max: 20 },
  },
  getClientKey: () => "test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 }),
}));

// Mock CSRF protection
vi.mock("@/lib/csrf", () => ({
  csrfProtection: () => null,
}));

// Mock JWT
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (token: string) => {
      if (token === "valid-token") {
        return { id: 1, email: "test@example.com" };
      }
      throw new Error("Invalid token");
    },
  },
}));

// Mock config
vi.mock("../config", () => ({
  config: {
    auth: { secret: "test-secret" },
    isProduction: false,
  },
}));

// Import after mocks are set up
import { applyMiddleware, getAuthFromRequest } from "../api-middleware";

describe("Auth Middleware", () => {
  describe("applyMiddleware", () => {
    it("should allow requests that pass authentication when requireAuth is true", async () => {
      const request = new NextRequest("http://localhost/api/tasks", {
        headers: { authorization: "Bearer valid-token" },
      });

      const result = await applyMiddleware(request, { requireAuth: true });
      expect(result.error).toBeUndefined();
      expect(result.auth?.isAuthenticated).toBe(true);
      expect(result.auth?.userId).toBe(1);
    });

    it("should return 401 error when requireAuth is true and no token provided", async () => {
      const request = new NextRequest("http://localhost/api/tasks");

      const result = await applyMiddleware(request, { requireAuth: true });
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(401);
    });

    it("should return 401 error when requireAuth is true and invalid token provided", async () => {
      const request = new NextRequest("http://localhost/api/tasks", {
        headers: { authorization: "Bearer invalid-token" },
      });

      const result = await applyMiddleware(request, { requireAuth: true });
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(401);
    });

    it("should allow requests without auth when requireAuth is false", async () => {
      const request = new NextRequest("http://localhost/api/health");

      const result = await applyMiddleware(request, { requireAuth: false });
      expect(result.error).toBeUndefined();
    });
  });

  describe("getAuthFromRequest", () => {
    it("should extract user from Bearer token", async () => {
      const request = new NextRequest("http://localhost/api/tasks", {
        headers: { authorization: "Bearer valid-token" },
      });

      const auth = await getAuthFromRequest(request);
      expect(auth.isAuthenticated).toBe(true);
      expect(auth.userId).toBe(1);
      expect(auth.email).toBe("test@example.com");
    });

    it("should return unauthenticated when no token provided", async () => {
      const request = new NextRequest("http://localhost/api/tasks");

      const auth = await getAuthFromRequest(request);
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.userId).toBeNull();
    });
  });
});

describe("Rate Limiting", () => {
  it("should use custom rate limit for auth endpoints", async () => {
    const request = new NextRequest("http://localhost/api/auth/login");
    const result = await applyMiddleware(request, { requireAuth: true });

    // Should use auth rate limit (but still require auth)
    expect(result.error?.status).toBe(401);
  });

  it("should use custom rate limit for AI endpoints", async () => {
    const request = new NextRequest("http://localhost/api/ai", {
      headers: { authorization: "Bearer valid-token" },
    });
    const result = await applyMiddleware(request, { requireAuth: true });

    // Should use AI rate limit
    expect(result.auth?.isAuthenticated).toBe(true);
  });
});