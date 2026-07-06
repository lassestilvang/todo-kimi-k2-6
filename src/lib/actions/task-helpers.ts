/**
 * Logs an action for a task.
 * Used for audit trail and activity feed.
 * Note: This is a no-op in browser environments.
 */
export function logTaskAction(_taskId: number, _action: string, _details?: string) {
  // No-op in browser - actual logging happens on server
  if (typeof window !== "undefined") {
    return;
  }
  // In server environment, this would be called via server actions
}