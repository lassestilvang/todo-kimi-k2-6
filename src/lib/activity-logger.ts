import { getDb } from "./db";
import { logger } from "./logger";

/**
 * Entity types that can be logged in the activity system.
 * This is the unified entity type that covers all entities across the application.
 */
export type EntityType =
  | "task"
  | "list"
  | "label"
  | "template"
  | "user"
  | "notification"
  | "comment"
  | "share"
  | "habit"
  | "goal"
  | "decision"
  | "insight"
  | "skill"
  | "connection";

export interface ActivityLog {
  id: number;
  task_id: number | null;
  user_id: number | null;
  action: string;
  entity_type: EntityType;
  entity_id: number | null;
  details: string | null;
  created_at: string;
}

export interface CreateActivityInput {
  task_id?: number;
  user_id?: number;
  action: string;
  entity_type: EntityType;
  entity_id?: number;
  details?: string;
}

/**
 * Creates an activity log entry with structured logging.
 */
export async function createActivityLog(input: CreateActivityInput): Promise<ActivityLog> {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO activity_logs (task_id, user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.task_id || null,
      input.user_id || null,
      input.action,
      input.entity_type,
      input.entity_id || null,
      input.details || null
    );

  const logEntry: ActivityLog = {
    id: Number(result.lastInsertRowid),
    task_id: input.task_id || null,
    user_id: input.user_id || null,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id || null,
    details: input.details || null,
    created_at: new Date().toISOString(),
  };

  // Log to structured logger
  logger.info(`Activity: ${input.action}`, {
    entityType: input.entity_type,
    entityId: input.entity_id,
    taskId: input.task_id,
    userId: input.user_id,
  });

  return logEntry;
}

/**
 * Gets activity logs for a task.
 */
export async function getTaskActivityLogs(taskId: number, limit = 50): Promise<ActivityLog[]> {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM activity_logs WHERE task_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(taskId, limit) as ActivityLog[];
}

/**
 * Gets activity logs filtered by action type.
 */
export async function getActivityLogsByAction(
  actions: string[],
  limit = 100
): Promise<Array<ActivityLog & { user_name: string | null; user_email: string | null }>> {
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
    .all(...actions, limit) as Array<ActivityLog & { user_name: string | null; user_email: string | null }>;
}

/**
 * Gets activity logs for a user.
 */
export async function getUserActivityLogs(userId: number, limit = 50): Promise<ActivityLog[]> {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM activity_logs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(userId, limit) as ActivityLog[];
}

/**
 * Get recent activity logs with user details.
 */
export async function getRecentActivityLogs(limit = 100): Promise<Array<ActivityLog & { user_name: string | null; user_email: string | null }>> {
  const db = getDb();
  return db
    .prepare(
      `SELECT al.*, u.name as user_name, u.email as user_email
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT ?`
    )
    .all(limit) as Array<ActivityLog & { user_name: string | null; user_email: string | null }>;
}

/**
 * Initializes the activity_logs table if it doesn't exist.
 * Includes all entity types for comprehensive activity tracking.
 */
export function initializeActivityLogsTable(db: ReturnType<typeof getDb>) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('task', 'list', 'label', 'template', 'user', 'notification', 'comment', 'share', 'habit', 'goal', 'decision', 'insight', 'skill', 'connection')),
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

/**
 * Convenience functions for common action types with structured details.
 */

/**
 * Log task creation with name
 */
export async function logTaskCreated(taskId: number, taskName: string): Promise<ActivityLog> {
  return createActivityLog({
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
export async function logTaskCompleted(taskId: number): Promise<ActivityLog> {
  return createActivityLog({
    task_id: taskId,
    action: "task_completed",
    entity_type: "task",
    entity_id: taskId,
  });
}

/**
 * Log task update with changes
 */
export async function logTaskUpdated(
  taskId: number,
  changes: Record<string, unknown>
): Promise<ActivityLog> {
  return createActivityLog({
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
export async function logTaskDeleted(taskId: number): Promise<ActivityLog> {
  return createActivityLog({
    task_id: taskId,
    action: "task_deleted",
    entity_type: "task",
    entity_id: taskId,
  });
}

/**
 * Log user comment addition
 */
export async function logCommentAdded(
  taskId: number,
  commentId: number,
  authorName: string
): Promise<ActivityLog> {
  return createActivityLog({
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
): Promise<ActivityLog> {
  return createActivityLog({
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
): Promise<ActivityLog> {
  return createActivityLog({
    task_id: taskId,
    action: "task_shared",
    entity_type: "share",
    entity_id: taskId,
    details: JSON.stringify({ sharedWith: sharedWithUserId, permission }),
  });
}

/**
 * Log notification sent
 */
export async function logNotificationSent(
  userId: number,
  type: string,
  data?: Record<string, unknown>
): Promise<ActivityLog> {
  return createActivityLog({
    user_id: userId,
    action: "notification_sent",
    entity_type: "notification",
    details: JSON.stringify({ type, ...data }),
  });
}