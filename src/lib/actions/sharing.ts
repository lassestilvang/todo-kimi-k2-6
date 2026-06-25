"use server";

import { getDb } from "@/lib/db";
import type { TaskShare, User } from "@/types";

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

// Get users shared with a task
export async function getTaskShares(taskId: number): Promise<Array<TaskShare & { user: User }>> {
  const db = getDb();
  const shares = db
    .prepare(
      `SELECT ts.id, ts.task_id, ts.user_id, ts.permission, ts.created_at,
              u.id as user_db_id, u.email, u.name, u.avatar_url, u.created_at as user_created_at
       FROM task_shares ts
       JOIN users u ON ts.user_id = u.id
       WHERE ts.task_id = ?`
    )
    .all(taskId) as Array<{
      id: number;
      task_id: number;
      user_id: number;
      permission: "view" | "edit";
      created_at: string;
      user_db_id: number;
      email: string;
      name: string | null;
      avatar_url: string | null;
      user_created_at: string;
    }>;

  return shares.map((share) => ({
    id: share.id,
    task_id: share.task_id,
    user_id: share.user_id,
    permission: share.permission,
    created_at: share.created_at,
    user: {
      id: share.user_db_id,
      email: share.email,
      name: share.name,
      avatar_url: share.avatar_url,
      created_at: share.user_created_at,
    },
  }));
}

// Get tasks shared with a user
export async function getSharedTasks(userId: number): Promise<TaskShare[]> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM task_shares WHERE user_id = ?")
    .all(userId) as TaskShare[];
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
