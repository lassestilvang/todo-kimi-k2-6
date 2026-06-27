"use server";

import { getDb } from "@/lib/db";
import type { User } from "@/types";

/**
 * Get all users (for assignment)
 */
export async function getUsers(): Promise<User[]> {
  const db = getDb();
  return db.prepare("SELECT id, email, name, avatar_url FROM users ORDER BY name, email").all() as User[];
}

/**
 * Search users by email or name
 */
export async function searchUsers(query: string): Promise<User[]> {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, email, name, avatar_url FROM users
       WHERE email LIKE ? OR name LIKE ?
       ORDER BY name, email
       LIMIT 20`
    )
    .all(`%${query}%`, `%${query}%`) as User[];
}