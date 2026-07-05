"use server";

import { getDb } from "@/lib/db";
import type { User } from "@/types";

/**
 * Get the current authenticated user from the session
 * Returns null if no user is authenticated (demo mode)
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // In demo mode, return a mock user or check session
    // This is a placeholder implementation
    const db = getDb();

    // Try to get user from session/token (would be set by NextAuth middleware)
    // For now, check if there's any user in the database
    const user = db.prepare(
      "SELECT * FROM users LIMIT 1"
    ).get() as User | undefined;

    return user || null;
  } catch {
    return null;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM users WHERE email = ?"
  ).get(email) as User | null;
}

/**
 * Create a new user
 */
export async function createUser(email: string, name?: string): Promise<User> {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO users (email, name) VALUES (?, ?)"
  ).run(email, name || null);

  return db.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).get(result.lastInsertRowid) as User;
}