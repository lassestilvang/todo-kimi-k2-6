import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the database
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    prepare: () => ({
      all: () => [],
      get: () => undefined,
      run: () => ({ lastInsertRowid: 1 }),
    }),
    transaction: (fn: () => unknown) => fn(),
  }),
}));

// Mock the rate limiter
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

// Mock actions
vi.mock("@/lib/actions", () => ({
  getTasks: () => Promise.resolve([]),
  createTask: () => Promise.resolve({ id: 1, name: "Test Task" }),
}));

import { applyMiddleware } from "@/lib/api-middleware";

// Import the route handler
vi.mock("@/lib/offline-storage", () => ({
  syncOfflineTasks: () => Promise.resolve({}),
  getSyncStatus: () => ({}),
  clearSyncedTasks: () => {},
}));

describe("API Routes - Authentication", () => {
  describe("Tasks API", () => {
    describe("GET /api/tasks", () => {
      it("should return 401 when no authentication token provided", async () => {
        const request = new NextRequest("http://localhost/api/tasks");

        // The middleware should block unauthenticated requests
        const result = await applyMiddleware(request, { requireAuth: true });
        expect(result.error).toBeDefined();
        expect(result.error?.status).toBe(401);
      });

      it("should allow request with valid authentication token", async () => {
        const request = new NextRequest("http://localhost/api/tasks", {
          headers: { authorization: "Bearer valid-token" },
        });

        const result = await applyMiddleware(request, { requireAuth: true });
        expect(result.error).toBeUndefined();
        expect(result.auth?.isAuthenticated).toBe(true);
        expect(result.auth?.userId).toBe(1);
      });
    });

    describe("POST /api/tasks", () => {
      it("should return 401 when trying to create task without authentication", async () => {
        const request = new NextRequest("http://localhost/api/tasks", {
          method: "POST",
          body: JSON.stringify({ name: "Test Task" }),
        });

        const result = await applyMiddleware(request, { requireAuth: true });
        expect(result.error).toBeDefined();
        expect(result.error?.status).toBe(401);
      });
    });
  });

  describe("Labels API", () => {
    it("should require authentication for GET /api/labels", async () => {
      const request = new NextRequest("http://localhost/api/labels");
      const result = await applyMiddleware(request, { requireAuth: true });
      expect(result.error?.status).toBe(401);
    });

    it("should require authentication for POST /api/labels", async () => {
      const request = new NextRequest("http://localhost/api/labels", {
        method: "POST",
        body: JSON.stringify({ name: "Test Label" }),
      });
      const result = await applyMiddleware(request, { requireAuth: true });
      expect(result.error?.status).toBe(401);
    });
  });

  describe("Templates API", () => {
    it("should require authentication for GET /api/templates", async () => {
      const request = new NextRequest("http://localhost/api/templates");
      const result = await applyMiddleware(request, { requireAuth: true });
      expect(result.error?.status).toBe(401);
    });

    it("should require authentication for POST /api/templates", async () => {
      const request = new NextRequest("http://localhost/api/templates", {
        method: "POST",
        body: JSON.stringify({ name: "Test Template" }),
      });
      const result = await applyMiddleware(request, { requireAuth: true });
      expect(result.error?.status).toBe(401);
    });
  });
});