import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimits, getClientKey } from "@/lib/rate-limiter";

export async function rateLimitMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const clientKey = getClientKey(request);

  // Determine which rate limiter to use
  let limiter = rateLimits.api;
  if (pathname.startsWith("/api/auth")) {
    limiter = rateLimits.auth;
  } else if (pathname.startsWith("/api/ai")) {
    limiter = rateLimits.ai;
  }

  const { allowed, remaining, resetTime } = limiter.isAllowed(clientKey);

  if (!allowed) {
    return new NextResponse(
      JSON.stringify({
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString(),
          "X-RateLimit-Limit": limiter["config"].max.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": resetTime.toString(),
        },
      }
    );
  }

  // Add rate limit headers to response
  const headers = {
    "X-RateLimit-Limit": limiter["config"].max.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetTime.toString(),
  };

  return { allowed: true, headers };
}