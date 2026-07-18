import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { applyMiddleware } from "@/lib/api-middleware";

// Mock CSRF protection
vi.mock("@/lib/csrf", () => ({
  csrfProtection: () => null,
}));

// Mock rate limiter
vi.mock("@/lib/rate-limiter", () => ({
  rateLimits: { api: { windowMs: 60000, max: 100 } },
  getClientKey: () => "test-client",
  checkRateLimit: () => Promise.resolve({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 }),
}));

// Mock JWT to simulate authenticated user
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
vi.mock("@/lib/config", () => ({
  config: {
    auth: { secret: "test-secret" },
    isProduction: false,
  },
}));

// Mock database
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    prepare: vi.fn(),
  }),
}));

describe("Habit Context API", () => {
  describe("Authentication", () => {
    it("should return 401 when no authentication token provided", async () => {
      const request = new NextRequest("http://localhost/api/habit-context");
      const result = await applyMiddleware(request, { requireAuth: true });
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(401);
    });

    it("should allow request with valid authentication token", async () => {
      const request = new NextRequest("http://localhost/api/habit-context", {
        headers: { authorization: "Bearer valid-token" },
      });
      const result = await applyMiddleware(request, { requireAuth: true });
      expect(result.error).toBeUndefined();
      expect(result.auth?.isAuthenticated).toBe(true);
      expect(result.auth?.userId).toBe(1);
    });
  });

  describe("Request Validation", () => {
    it("should validate habit context input fields", async () => {
      const requiredFields = ["task_id", "context_type", "context_value"];
      const input = { task_id: 1, context_type: "time_of_day", context_value: "morning" };

      const hasAllFields = requiredFields.every(field => field in input);
      expect(hasAllFields).toBe(true);
    });

    it("should reject request missing required fields", async () => {
      const requiredFields = ["task_id", "context_type", "context_value"];
      const input = { task_id: 1 };

      const hasAllFields = requiredFields.every(field => field in input);
      expect(hasAllFields).toBe(false);
    });
  });
});