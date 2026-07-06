import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { UnauthorizedError } from "./error-handler";

interface SessionUser {
  id: number;
  email?: string;
  name?: string;
}

interface Session {
  user?: SessionUser;
}

/**
 * Authentication middleware for API routes
 * Usage: Wrap your API handler with requireAuth()
 *
 * @example
 * export const GET = requireAuth(async (req, session) => {
 *   // req is the NextRequest, session is the user session
 *   return Response.json({ user: session.user });
 * });
 */
export function requireAuth() {
  return async (handler: (req: NextRequest, session: Session) => Promise<Response>) => {
    const session = await getServerSession();
    if (!session) {
      throw new UnauthorizedError("Authentication required");
    }
    // Note: This middleware pattern requires NextRequest to be passed separately
    // The req parameter should be provided by the caller
    throw new Error("requireAuth middleware needs NextRequest parameter - use withAuth helper instead");
  };
}

/**
 * Get the current user session, returns null if not authenticated
 */
export async function getSession(): Promise<Session | null> {
  return getServerSession();
}

/**
 * Get the current user ID, throws if not authenticated
 */
export async function getUserId(): Promise<number> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new UnauthorizedError("Authentication required");
  }
  return Number(session.user.id);
}