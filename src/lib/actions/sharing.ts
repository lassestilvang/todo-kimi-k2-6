"use server";

import { getDb } from "@/lib/db";
import type { TaskShare, User } from "@/types";
import { randomBytes } from "crypto";

// Share a task with a user
export async function shareTask(
  taskId: number,
  userId: number,
  permission: "view" | "edit" = "view"
): Promise<TaskShare> {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT OR REPLACE INTO task_shares (task_id, user_id, permission) VALUES (?, ?, ?)"
    )
    .run(taskId, userId, permission);

  return {
    id: Number(result.lastInsertRowid) || 0,
    task_id: taskId,
    user_id: userId,
    permission,
    created_at: new Date().toISOString(),
  };
}

// Create a public share link for a task
export async function createPublicShare(
  taskId: number,
  permission: "view" | "edit" = "view"
): Promise<{ token: string; permission: "view" | "edit" }> {
  const db = getDb();

  // Generate a random token
  const token = randomBytes(16).toString("hex");

  // Update or insert the share with token
  // First, try to update existing share
  const existing = db
    .prepare("SELECT id FROM task_shares WHERE task_id = ? AND share_token IS NULL")
    .get(taskId) as { id: number } | undefined;

  if (existing) {
    db.prepare("UPDATE task_shares SET share_token = ?, permission = ? WHERE id = ?")
      .run(token, permission, existing.id);
  } else {
    // Insert new share with token
    db.prepare("INSERT INTO task_shares (task_id, permission, share_token) VALUES (?, ?, ?)")
      .run(taskId, permission, token);
  }

  return { token, permission };
}

// Get users shared with a task
export async function getTaskShares(taskId: number): Promise<Array<TaskShare & { user?: User; share_token?: string }>> {
  const db = getDb();
  // Use LEFT JOIN to include public shares (which don't have user_id)
  const shares = db
    .prepare(
      `SELECT ts.id, ts.task_id, ts.user_id, ts.permission, ts.share_token, ts.created_at,
              u.id as user_db_id, u.email, u.name, u.avatar_url, u.created_at as user_created_at
       FROM task_shares ts
       LEFT JOIN users u ON ts.user_id = u.id
       WHERE ts.task_id = ?`
    )
    .all(taskId) as Array<{
      id: number;
      task_id: number;
      user_id: number | null;
      permission: "view" | "edit";
      share_token: string | null;
      created_at: string;
      user_db_id: number | null;
      email: string | null;
      name: string | null;
      avatar_url: string | null;
      user_created_at: string | null;
    }>;

  const result: Array<TaskShare & { user?: User; share_token?: string }> = shares.map((share) => ({
    id: share.id,
    task_id: share.task_id,
    user_id: share.user_id ?? undefined as unknown as number,
    permission: share.permission,
    share_token: share.share_token ?? undefined,
    created_at: share.created_at,
    user: share.user_db_id ? {
      id: share.user_db_id,
      email: share.email!,
      name: share.name,
      avatar_url: share.avatar_url,
      created_at: share.user_created_at!,
    } : undefined,
  }));
  return result;
}

// Get tasks shared with a user
export async function getSharedTasks(userId: number): Promise<TaskShare[]> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM task_shares WHERE user_id = ?")
    .all(userId) as TaskShare[];
}

// Get share by token
export async function getShareByToken(token: string): Promise<(TaskShare & { task_id: number }) | null> {
  const db = getDb();
  return db
    .prepare("SELECT id, task_id, user_id, permission, created_at FROM task_shares WHERE share_token = ?")
    .get(token) as (TaskShare & { task_id: number }) | null;
}

// Remove a share
export async function removeShare(shareId: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM task_shares WHERE id = ?").run(shareId);
}

// Create or get user
export async function getOrCreateUser(email: string, name?: string | null, avatarUrl?: string | null): Promise<User> {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;

  if (existing) return existing;

  const result = db
    .prepare("INSERT INTO users (email, name, avatar_url) VALUES (?, ?, ?)")
    .run(email, name, avatarUrl);

  return {
    id: Number(result.lastInsertRowid),
    email,
    name: name || null,
    avatar_url: avatarUrl || null,
    created_at: new Date().toISOString(),
  };
}
