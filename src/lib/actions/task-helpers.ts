/**
 * Logs an action for a task.
 * Used for audit trail and activity feed.
 * Note: This is a server-side function.
 */
export async function logTaskAction(taskId: number, action: string, details?: string): Promise<void> {
  if (typeof window !== "undefined") {
    return;
  }
  // Dynamic import to avoid loading native modules in browser
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getDb } = require("@/lib/db");
  const { sanitizeString } = require("@/lib/validation");

  const db = getDb();
  db.prepare("INSERT INTO task_logs (task_id, action, details) VALUES (?, ?, ?)").run(
    taskId,
    action,
    details ? sanitizeString(details) : null
  );
}