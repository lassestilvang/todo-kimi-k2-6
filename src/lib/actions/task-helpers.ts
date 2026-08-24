/**
 * Logs an action for a task.
 * Used for audit trail and activity feed.
 * Note: This is a server-side function.
 */
export async function logTaskAction(
  taskId: number,
  action: string,
  details?: string
): Promise<void> {
  if (typeof window !== 'undefined') {
    return;
  }
  // Server-side only - use dynamic import
  const { getDb } = await import('@/lib/db');
  const { sanitizeString } = await import('@/lib/validation');

  const db = getDb();
  db.prepare(
    'INSERT INTO task_logs (task_id, action, details) VALUES (?, ?, ?)'
  ).run(taskId, action, details ? sanitizeString(details) : null);
}
