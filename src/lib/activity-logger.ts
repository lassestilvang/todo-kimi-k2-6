import { getDb } from "./db";
import { logger } from "./logger";

export interface ActivityLog {
  id: number;
  task_id: number | null;
  user_id: number | null;
  action: string;
  entity_type: "task" | "list" | "label" | "template" | "user";
  entity_id: number | null;
  details: string | null;
  created_at: string;
}

export interface CreateActivityInput {
  task_id?: number;
  user_id?: number;
  action: string;
  entity_type: "task" | "list" | "label" | "template" | "user";
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
 * Gets recent activity logs across all entities.
 */
export async function getRecentActivityLogs(limit = 100): Promise<ActivityLog[]> {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?`
    )
    .all(limit) as ActivityLog[];
}

/**
 * Initializes the activity_logs table if it doesn't exist.
 */
export function initializeActivityLogsTable(db: ReturnType<typeof getDb>) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('task', 'list', 'label', 'template', 'user')),
      entity_id INTEGER,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_activity_logs_task ON activity_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
  `);
}