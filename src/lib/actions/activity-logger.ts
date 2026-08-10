"use server";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export interface ActivityLogEntry {
  id: number;
  task_id: number | null;
  user_id: number | null;
  action: string;
  entity_type: "task" | "list" | "label" | "template" | "user" | "notification" | "comment" | "share";
  entity_id: number | null;
  details: string | null;
  created_at: string;
}

export interface CreateActivityInput {
  task_id?: number;
  action: string;
  entity_type: "task" | "list" | "label" | "template" | "user" | "notification" | "comment" | "share";
  entity_id?: number;
  details?: string;
}

/**
 * Creates an activity log entry.
 * Called automatically from task operations, or manually for custom events.
 */
export async function logActivity(input: CreateActivityInput): Promise<ActivityLogEntry> {
  const db = getDb();
  const user = await getCurrentUser();
  const userId = user?.id ?? 0;

  const result = db
    .prepare(
      `INSERT INTO activity_logs (task_id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      input.task_id ?? null,
      userId,
      input.action,
      input.entity_type,
      input.entity_id ?? null,
      input.details ?? null
    );

  const id = Number(result.lastInsertRowid);

  return {
    id,
    task_id: input.task_id ?? null,
    user_id: userId,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    details: input.details ?? null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Gets activity logs for a specific task.
 */
export async function getTaskActivityLogs(
  taskId: number,
  limit = 50
): Promise<ActivityLogEntry[]> {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM activity_logs
       WHERE task_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(taskId, limit) as ActivityLogEntry[];
}

/**
 * Gets recent activity logs across all entities.
 */
export async function getRecentActivityLogs(limit = 100): Promise<Array<ActivityLogEntry & { user_name: string | null; user_email: string | null }>> {
  const db = getDb();
  return db
    .prepare(
      `SELECT al.*, u.name as user_name, u.email as user_email
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT ?`
    )
    .all(limit) as Array<ActivityLogEntry & { user_name: string | null; user_email: string | null }>;
}

/**
 * Gets activity logs for a user.
 */
export async function getUserActivityLogs(userId: number, limit = 50): Promise<ActivityLogEntry[]> {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM activity_logs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(userId, limit) as ActivityLogEntry[];
}

/**
 * Gets activity logs filtered by action type.
 */
export async function getActivityLogsByAction(
  actions: string[],
  limit = 100
): Promise<Array<ActivityLogEntry & { user_name: string | null; user_email: string | null }>> {
  const db = getDb();
  const placeholders = actions.map(() => "?").join(",");

  return db
    .prepare(
      `SELECT al.*, u.name as user_name, u.email as user_email
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.action IN (${placeholders})
       ORDER BY al.created_at DESC
       LIMIT ?`
    )
    .all(...actions, limit) as Array<ActivityLogEntry & { user_name: string | null; user_email: string | null }>;
}

/**
 * Initializes the activity_logs table.
 * Called during app startup or testing.
 */
export function initializeActivityLogsTable(db: ReturnType<typeof getDb>): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('task', 'list', 'label', 'template', 'user', 'notification', 'comment', 'share')),
      entity_id INTEGER,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_activity_logs_task ON activity_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
  `);
}

// Convenience functions for common actions

/**
 * Log task creation
 */
export async function logTaskCreated(taskId: number, taskName: string): Promise<ActivityLogEntry> {
  return logActivity({
    task_id: taskId,
    action: "task_created",
    entity_type: "task",
    entity_id: taskId,
    details: JSON.stringify({ taskName }),
  });
}

/**
 * Log task completion
 */
export async function logTaskCompleted(taskId: number): Promise<ActivityLogEntry> {
  return logActivity({
    task_id: taskId,
    action: "task_completed",
    entity_type: "task",
    entity_id: taskId,
  });
}

/**
 * Log task update
 */
export async function logTaskUpdated(
  taskId: number,
  changes: Record<string, unknown>
): Promise<ActivityLogEntry> {
  return logActivity({
    task_id: taskId,
    action: "task_updated",
    entity_type: "task",
    entity_id: taskId,
    details: JSON.stringify(changes),
  });
}

/**
 * Log task deletion
 */
export async function logTaskDeleted(taskId: number): Promise<ActivityLogEntry> {
  return logActivity({
    task_id: taskId,
    action: "task_deleted",
    entity_type: "task",
    entity_id: taskId,
  });
}

/**
 * Log user comment
 */
export async function logCommentAdded(
  taskId: number,
  commentId: number,
  authorName: string
): Promise<ActivityLogEntry> {
  return logActivity({
    task_id: taskId,
    action: "comment_added",
    entity_type: "comment",
    entity_id: commentId,
    details: JSON.stringify({ author: authorName }),
  });
}

/**
 * Log task assignment
 */
export async function logTaskAssigned(
  taskId: number,
  assigneeId: number,
  assigneeName: string
): Promise<ActivityLogEntry> {
  return logActivity({
    task_id: taskId,
    action: "task_assigned",
    entity_type: "task",
    entity_id: taskId,
    details: JSON.stringify({ assigneeId, assigneeName }),
  });
}

/**
 * Log task share
 */
export async function logTaskShared(
  taskId: number,
  sharedWithUserId: number,
  permission: "view" | "edit"
): Promise<ActivityLogEntry> {
  return logActivity({
    task_id: taskId,
    action: "task_shared",
    entity_type: "share",
    entity_id: taskId,
    details: JSON.stringify({ sharedWith: sharedWithUserId, permission }),
  });
}