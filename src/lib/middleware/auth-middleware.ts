import { getServerSession } from "next-auth";
import { UnauthorizedError } from "./error-handler";

/**
 * Authentication middleware for API routes
 * This is a configuration helper - actual auth is handled by applyMiddleware in api-middleware.ts
 * @deprecated This function is deprecated. Use the middleware configuration in applyMiddleware instead.
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- kept for middleware compatibility */
function requireAuth(): undefined {
  // This is a configuration marker for applyMiddleware
  return undefined;
}

/**
 * Get the current user session, returns null if not authenticated
 */
export async function getSession(): Promise<Record<string, unknown> | null> {
  return getServerSession();
}

/**
 * Get the current user ID, throws if not authenticated
 */
export async function getUserId(): Promise<number> {
  const session = await getServerSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (session as any)?.user;
  if (!user?.id) {
    throw new UnauthorizedError("Authentication required");
  }
  return Number(user.id);
}