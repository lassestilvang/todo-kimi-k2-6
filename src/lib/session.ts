/**
 * Session utilities for server-side user context
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/config";
import type { User } from "@/types";

/**
 * Get the current user from the session.
 * In demo mode, returns a default user if no session exists.
 * Gracefully handles cases where session is not available (e.g., in tests).
 */
export async function getCurrentUser(): Promise<User | null> {
  // Check if we're in a test environment or outside request context
  if (typeof window !== "undefined" || process.env.NODE_ENV === "test") {
    // In browser or test environment, return demo user or null
    const demoMode = process.env.NEXTAUTH_SECRET === "demo-secret" || process.env.NODE_ENV === "development";
    if (demoMode) {
      return {
        id: 1,
        email: "demo@taskflow.app",
        name: "Demo User",
        avatar_url: null,
        created_at: new Date().toISOString(),
      };
    }
    return null;
  }

  try {
    const session = await getServerSession(authOptions);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userSession = session as any;
    if (userSession?.user?.email) {
      return {
        id: Number(userSession.user.id),
        email: userSession.user.email,
        name: userSession.user.name || null,
        avatar_url: userSession.user.image || null,
        created_at: new Date().toISOString(),
      };
    }
  } catch {
    // getServerSession throws outside request context (e.g., in tests)
    // Fall through to demo mode
  }

  // Demo mode: return default user for local development
  // In production, this should NOT be used
  const demoMode = process.env.NEXTAUTH_SECRET === "demo-secret" || process.env.NODE_ENV === "development";
  if (demoMode) {
    return {
      id: 1,
      email: "demo@taskflow.app",
      name: "Demo User",
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Get the current user ID, or throw if not authenticated.
 */
export async function requireUserId(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user.id;
}