/**
 * API Middleware - Consistent authentication, rate limiting, and error handling
 * Apply this middleware to all API routes for security
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimits, getClientKey, checkRateLimit } from "@/lib/rate-limiter";
import { csrfProtection } from "@/lib/csrf";
import jwt from "jsonwebtoken";

import { config } from "@/lib/config";
import { MAX_REQUEST_SIZE } from "@/lib/validation";

const JWT_SECRET = config.auth.secret;

/**
 * Check request body size to prevent DoS attacks
 */
export async function checkRequestBodySize(request: NextRequest): Promise<{ exceeded: boolean; size: number }> {
  const contentLength = request.headers.get("content-length");
  const size = contentLength ? parseInt(contentLength, 10) : 0;
  return { exceeded: size > MAX_REQUEST_SIZE, size };
}

export interface AuthResult {
  userId: number | null;
  email: string | null;
  isAuthenticated: boolean;
}

/**
 * Get user from JWT token in Authorization header or cookie
 */
export async function getAuthFromRequest(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || request.cookies.get("token")?.value;

  if (!token) {
    return { userId: null, email: null, isAuthenticated: false };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    return {
      userId: payload.id,
      email: payload.email,
      isAuthenticated: true,
    };
  } catch {
    return { userId: null, email: null, isAuthenticated: false };
  }
}

/**
 * Apply security middleware to API routes
 * - Rate limiting
 * - CSRF protection for mutating requests
 * - Request body size limits
 * - Optional authentication requirement
 */
export async function applyMiddleware(
  request: NextRequest,
  options?: { requireAuth?: boolean }
): Promise<{ error?: Response; headers?: Record<string, string>; auth?: AuthResult }> {
  const pathname = request.nextUrl.pathname;

  // Check request body size for POST/PUT/PATCH requests
  const method = request.method.toUpperCase();
  if (["POST", "PUT", "PATCH"].includes(method)) {
    const { exceeded } = await checkRequestBodySize(request);
    if (exceeded) {
      return {
        error: NextResponse.json(
          {
            error: "Payload too large",
            message: `Request body exceeds ${MAX_REQUEST_SIZE / 1024}KB limit`,
            code: "PAYLOAD_TOO_LARGE",
          },
          { status: 413 }
        ),
      };
    }
  }

  // Apply CSRF protection for mutating requests
  const csrfResponse = await csrfProtection(request);
  if (csrfResponse) {
    return { error: csrfResponse };
  }

  // Determine which rate limiter to use
  let limiterConfig = rateLimits.api;
  if (pathname.startsWith("/api/auth")) {
    limiterConfig = rateLimits.auth;
  } else if (pathname.startsWith("/api/ai")) {
    limiterConfig = rateLimits.ai;
  }

  // Apply rate limiting
  const clientKey = getClientKey(request);
  const rateLimitResult = await checkRateLimit(clientKey, limiterConfig);
  if (!rateLimitResult.allowed) {
    return {
      error: NextResponse.json(
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": limiterConfig.max.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
          },
        }
      ),
    };
  }

  // Check authentication if required
  const auth = await getAuthFromRequest(request);
  if (options?.requireAuth && !auth.isAuthenticated) {
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  // Add rate limit headers to response
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": limiterConfig.max.toString(),
    "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
    "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
  };

  return { headers, auth };
}

// Re-export rateLimits for convenience
export { rateLimits } from "./rate-limiter";

/**
 * Create a JSON response with proper headers
 */
export function jsonResponse(
  data: unknown,
  init?: number | ResponseInit,
  middlewareHeaders?: Record<string, string>
): NextResponse {
  const response = NextResponse.json(data, init);

  // Add rate limit headers
  if (middlewareHeaders) {
    for (const [key, value] of Object.entries(middlewareHeaders)) {
      response.headers.set(key, value);
    }
  }

  // Add CSP security headers
  const cspHeaders = getCSPHeaders();
  for (const [key, value] of Object.entries(cspHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

/**
 * Get CSP nonce from environment or generate one
 */
export function getCSPNonce(): string | undefined {
  return process.env.CSP_NONCE;
}

/**
 * Generate CSP headers for security
 */
export function getCSPHeaders(): Record<string, string> {
  const nonce = getCSPNonce();
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'" + (nonce ? ` 'nonce-${nonce}'` : ""),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  return {
    "Content-Security-Policy": directives.join("; "),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

/**
 * Error response helper
 */
export function errorResponse(
  message: string,
  status = 500,
  details?: unknown
): NextResponse {
  const response = NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );

  // Add security headers to error responses
  const cspHeaders = getCSPHeaders();
  for (const [key, value] of Object.entries(cspHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}