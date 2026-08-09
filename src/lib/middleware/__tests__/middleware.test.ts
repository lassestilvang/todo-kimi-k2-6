import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  applyMiddleware,
  jsonResponse,
  errorResponse,
  getCSPHeaders,
  getCSPNonce,
  AuthResult,
} from "../../api-middleware";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken"; // used in tests

// Mock dependencies
vi.mock("@/lib/rate-limiter", () => ({
  rateLimits: {
    api: { max: 100, windowMs: 60000 },
    auth: { max: 10, windowMs: 60000 },
    ai: { max: 60, windowMs: 60000 },
  },
  getClientKey: vi.fn().mockReturnValue("test-client"),
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 }),
}));

vi.mock("@/lib/csrf", () => ({
  csrfProtection: vi.fn().mockResolvedValue(null),
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
    sign: vi.fn().mockReturnValue("signed-token"),
  },
}));

vi.mock("@/lib/config", () => ({
  config: {
    auth: { secret: "test-jwt-secret-key" },
  },
}));

vi.mock("@/lib/validation", () => ({
  MAX_REQUEST_SIZE: 1024 * 1024, // 1MB
}));

describe("API Middleware", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation for verify - returns valid user
    vi.mocked(jwt.verify).mockImplementation(() => ({ id: 1, email: "test@example.com" }));
    mockRequest = new NextRequest("http://localhost/api/test", {
      method: "GET",
      headers: new Headers({
        "content-type": "application/json",
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("applyMiddleware", () => {
    it("should return headers and auth for valid request", async () => {
      const result = await applyMiddleware(mockRequest);

      expect(result).toBeDefined();
      expect(result.headers).toBeDefined();
      expect(result.auth).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should set rate limit headers", async () => {
      const result = await applyMiddleware(mockRequest);

      expect(result.headers!["X-RateLimit-Limit"]).toBe("100");
      expect(result.headers!["X-RateLimit-Remaining"]).toBe("99");
      expect(result.headers!["X-RateLimit-Reset"]).toBeDefined();
    });

    it("should handle auth routes with different rate limits", async () => {
      const authRequest = new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
      });

      const result = await applyMiddleware(authRequest);

      // Should use auth rate limits (10 max)
      expect(result.headers!["X-RateLimit-Limit"]).toBe("10");
    });

    it("should handle AI routes with different rate limits", async () => {
      const aiRequest = new NextRequest("http://localhost/api/ai/chat", {
        method: "POST",
      });

      const result = await applyMiddleware(aiRequest);

      // Should use AI rate limits (60 max)
      expect(result.headers!["X-RateLimit-Limit"]).toBe("60");
    });

    it("should return error for rate limit exceeded", async () => {
      const { checkRateLimit } = await import("@/lib/rate-limiter");
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now(),
        limit: 100,
      });

      const result = await applyMiddleware(mockRequest);

      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(429);
    });

    it("should reject payload that exceeds size limit for POST requests", async () => {
      const bigData = "x".repeat(2 * 1024 * 1024); // 2MB
      const postRequest = new NextRequest("http://localhost/api/test", {
        method: "POST",
        headers: new Headers({
          "content-length": String(bigData.length),
        }),
      });

      const result = await applyMiddleware(postRequest);

      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(413);
    });

    it("should allow payload within size limit", async () => {
      const smallData = "x".repeat(1000); // 1KB
      const postRequest = new NextRequest("http://localhost/api/test", {
        method: "POST",
        headers: new Headers({
          "content-length": String(smallData.length),
        }),
      });

      const result = await applyMiddleware(postRequest);

      expect(result.error).toBeUndefined();
    });

    it("should handle PUT requests with payload check", async () => {
      const putRequest = new NextRequest("http://localhost/api/test", {
        method: "PUT",
      });

      const result = await applyMiddleware(putRequest);

      expect(result.error).toBeUndefined();
    });

    it("should handle PATCH requests with payload check", async () => {
      const patchRequest = new NextRequest("http://localhost/api/test", {
        method: "PATCH",
      });

      const result = await applyMiddleware(patchRequest);

      expect(result.error).toBeUndefined();
    });

    it("should not check payload size for GET requests", async () => {
      const getRequest = new NextRequest("http://localhost/api/test", {
        method: "GET",
        headers: new Headers({
          "content-length": String(2 * 1024 * 1024), // 2MB
        }),
      });

      const result = await applyMiddleware(getRequest);

      // GET requests don't have body, so payload check passes
      expect(result.error).toBeUndefined();
    });
  });

  describe("getAuthFromRequest", () => {
    it("should extract user from Bearer token in Authorization header", async () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: new Headers({
          "authorization": "Bearer valid-jwt-token",
        }),
      });

      const result = await import("../../api-middleware").then(m => m.getAuthFromRequest(request));

      expect(result.isAuthenticated).toBe(true);
      expect(result.userId).toBe(1);
      expect(result.email).toBe("test@example.com");
    });

    it("should return unauthenticated for missing token", async () => {
      const request = new NextRequest("http://localhost/api/test");

      const result = await import("../../api-middleware").then(m => m.getAuthFromRequest(request));

      expect(result.isAuthenticated).toBe(false);
      expect(result.userId).toBeNull();
      expect(result.email).toBeNull();
    });

    it("should return unauthenticated for invalid token", async () => {
      vi.mocked(jwt.verify).mockImplementationOnce(() => {
        throw new Error("Invalid token");
      });

      const request = new NextRequest("http://localhost/api/test", {
        headers: new Headers({
          "authorization": "Bearer invalid-token",
        }),
      });

      const result = await import("../../api-middleware").then(m => m.getAuthFromRequest(request));

      expect(result.isAuthenticated).toBe(false);
      expect(result.userId).toBeNull();
    });
  });

  describe("jsonResponse", () => {
    it("should return JSON response with correct data", () => {
      const data = { success: true, id: 1 };
      const response = jsonResponse(data, { status: 200 });

      expect(response).toBeDefined();
      expect(response.status).toBe(200);
    });

    it("should add rate limit headers when provided", () => {
      const data = { success: true };
      const headers = {
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "99",
        "X-RateLimit-Reset": "1234567890",
      };
      const response = jsonResponse(data, undefined, headers);

      expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("99");
      expect(response.headers.get("X-RateLimit-Reset")).toBe("1234567890");
    });

    it("should add CSP headers", () => {
      const response = jsonResponse({ test: true });

      expect(response.headers.get("Content-Security-Policy")).toBeDefined();
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      expect(response.headers.get("X-XSS-Protection")).toBe("1; mode=block");
    });

    it("should merge middleware headers with CSP headers", () => {
      const headers = { "X-Custom-Header": "value" };
      const response = jsonResponse({ test: true }, undefined, headers);

      expect(response.headers.get("X-Custom-Header")).toBe("value");
      expect(response.headers.get("Content-Security-Policy")).toBeDefined();
    });
  });

  describe("errorResponse", () => {
    it("should return error response with correct status", () => {
      const response = errorResponse("Error message", 400);

      expect(response).toBeDefined();
      expect(response.status).toBe(400);
    });

    it("should include error message in response", async () => {
      const response = errorResponse("Something went wrong", 500);
      const body = await response.json();

      expect(body.error).toBe("Something went wrong");
    });

    it("should include additional details when provided", async () => {
      const response = errorResponse("Validation failed", 400, { field: "email", reason: "Invalid format" });
      const body = await response.json();

      expect(body.details).toBeDefined();
      expect(body.details.field).toBe("email");
    });

    it("should add CSP headers to error response", () => {
      const response = errorResponse("Server error", 500);

      expect(response.headers.get("Content-Security-Policy")).toBeDefined();
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("should default to 500 for server errors", () => {
      const response = errorResponse("Unknown error");

      expect(response.status).toBe(500);
    });
  });

  describe("getCSPHeaders", () => {
    it("should return CSP headers object", () => {
      const headers = getCSPHeaders();

      expect(headers).toBeDefined();
      expect(headers["Content-Security-Policy"]).toBeDefined();
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["X-Frame-Options"]).toBe("DENY");
      expect(headers["X-XSS-Protection"]).toBe("1; mode=block");
      expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    });

    it("should include required CSP directives", () => {
      const headers = getCSPHeaders();
      const csp = headers["Content-Security-Policy"];

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src");
      expect(csp).toContain("style-src");
      expect(csp).toContain("img-src");
      expect(csp).toContain("frame-ancestors 'none'");
    });
  });

  describe("getCSPNonce", () => {
    it("should return undefined when CSP_NONCE is not set", () => {
      const result = getCSPNonce();
      expect(result).toBeUndefined();
    });

    it("should return nonce value when CSP_NONCE is set", () => {
      process.env.CSP_NONCE = "test-nonce-value";
      const result = getCSPNonce();
      expect(result).toBe("test-nonce-value");
      delete process.env.CSP_NONCE;
    });
  });

  describe("Auth result interface", () => {
    it("should match expected AuthResult shape", () => {
      const result: AuthResult = {
        userId: 1,
        email: "test@example.com",
        isAuthenticated: true,
      };

      expect(result.userId).toBe(1);
      expect(result.email).toBe("test@example.com");
      expect(result.isAuthenticated).toBe(true);
    });

    it("should handle null user values", () => {
      const result: AuthResult = {
        userId: null,
        email: null,
        isAuthenticated: false,
      };

      expect(result.userId).toBeNull();
      expect(result.email).toBeNull();
      expect(result.isAuthenticated).toBe(false);
    });
  });
});

describe("Middleware integration scenarios", () => {
  it("should handle comprehensive request flow", async () => {
    const request = new NextRequest("http://localhost/api/tasks", {
      method: "POST",
      headers: new Headers({
        "content-type": "application/json",
        "content-length": "100",
        "authorization": "Bearer test-token",
      }),
    });

    const result = await applyMiddleware(request);

    expect(result.headers).toBeDefined();
    expect(result.auth?.isAuthenticated).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should chain rate limit, CSRF, and auth checks", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: new Headers({
        "content-type": "application/json",
      }),
    });

    const result = await applyMiddleware(request, { requireAuth: false });

    expect(result.headers).toBeDefined();
    expect(result.auth).toBeDefined();
  });

  it("should reject unauthorized requests when auth required", async () => {
    const request = new NextRequest("http://localhost/api/protected", {
      method: "GET",
    });

    vi.mocked(jwt.verify).mockImplementationOnce(() => {
      throw new Error("Invalid token");
    });

    const result = await applyMiddleware(request, { requireAuth: true });

    // With no valid token, should return 401 error
    expect(result.error).toBeDefined();
    expect(result.error?.status).toBe(401);
    expect(result.headers?.["X-RateLimit-Limit"]).toBeUndefined();
  });
});

describe("Edge cases", () => {
  it("should handle missing content-length header", async () => {
    const request = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: new Headers({}), // No content-length
    });

    const result = await applyMiddleware(request);

    // Should pass (size check handles missing header)
    expect(result.error).toBeUndefined();
  });

  it("should handle zero content-length", async () => {
    const request = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: new Headers({
        "content-length": "0",
      }),
    });

    const result = await applyMiddleware(request);

    expect(result.error).toBeUndefined();
  });

  it("should handle request to root API path", async () => {
    const request = new NextRequest("http://localhost/api", {
      method: "GET",
    });

    const result = await applyMiddleware(request);

    expect(result.error).toBeUndefined();
    expect(result.headers).toBeDefined();
  });

  it("should handle request to nested API paths", async () => {
    const request = new NextRequest("http://localhost/api/v1/users/profile", {
      method: "GET",
    });

    const result = await applyMiddleware(request);

    expect(result.error).toBeUndefined();
    expect(result.headers).toBeDefined();
  });
});