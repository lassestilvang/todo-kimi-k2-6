import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimits, getClientKey, checkRateLimit } from "@/lib/rate-limiter";

export async function rateLimitMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const clientKey = getClientKey(request);

  // Determine which rate limiter to use
  let limiterConfig = rateLimits.api;
  if (pathname.startsWith("/api/auth")) {
    limiterConfig = rateLimits.auth;
  } else if (pathname.startsWith("/api/ai")) {
    limiterConfig = rateLimits.ai;
  }

  const result = await checkRateLimit(clientKey, limiterConfig);

  if (!result.allowed) {
    return {
      allowed: false,
      error: "Rate limit exceeded",
      response: NextResponse.json(
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": limiterConfig.max.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": result.resetTime.toString(),
          },
        }
      ),
    };
  }

  // Add rate limit headers to response
  const headers = {
    "X-RateLimit-Limit": limiterConfig.max.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.resetTime.toString(),
  };

  return { allowed: true, headers };
}