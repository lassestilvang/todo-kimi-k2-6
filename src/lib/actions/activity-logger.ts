'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import {
  createActivityLog,
  initializeActivityLogsTable,
  getActivityLogsByAction as activityLogsByAction,
  getUserActivityLogs as userActivityLogs,
  getRecentActivityLogs as recentActivityLogs,
  getTaskActivityLogs as taskActivityLogs,
  type ActivityLog,
  type CreateActivityInput,
  type EntityType,
} from '@/lib/activity-logger';

// Re-export core types and functions
export { createActivityLog, initializeActivityLogsTable };
export type { ActivityLog, CreateActivityInput, EntityType };

/**
 * Gets activity logs for a specific task.
 */
export async function getTaskActivityLogs(
  taskId: number,
  limit = 50
): Promise<ActivityLog[]> {
  return taskActivityLogs(taskId, limit);
}

/**
 * Gets recent activity logs across all entities.
 */
export async function getRecentActivityLogs(
  limit = 100
): Promise<
  Array<ActivityLog & { user_name: string | null; user_email: string | null }>
> {
  return recentActivityLogs(limit);
}

/**
 * Gets activity logs for a user.
 */
export async function getUserActivityLogs(
  userId: number,
  limit = 50
): Promise<ActivityLog[]> {
  return userActivityLogs(userId, limit);
}

/**
 * Gets activity logs filtered by action type.
 */
export async function getActivityLogsByAction(
  actions: string[],
  limit = 100
): Promise<
  Array<ActivityLog & { user_name: string | null; user_email: string | null }>
> {
  return activityLogsByAction(actions, limit);
}

/**
 * Creates an activity log entry with current user context.
 * Called automatically from task operations, or manually for custom events.
 */
export async function logActivity(
  input: CreateActivityInput
): Promise<ActivityLog> {
  const db = getDb();
  // Allow explicit user_id override, otherwise get from current user
  const userId = input.user_id ?? (await getCurrentUser())?.id ?? 0;

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
 * Log task creation
 */
export async function logTaskCreated(
  taskId: number,
  taskName: string
): Promise<ActivityLog> {
  return logActivity({
    task_id: taskId,
    action: 'task_created',
    entity_type: 'task',
    entity_id: taskId,
    details: JSON.stringify({ taskName }),
  });
}

/**
 * Log task completion
 */
export async function logTaskCompleted(taskId: number): Promise<ActivityLog> {
  return logActivity({
    task_id: taskId,
    action: 'task_completed',
    entity_type: 'task',
    entity_id: taskId,
  });
}

/**
 * Log task update
 */
export async function logTaskUpdated(
  taskId: number,
  changes: Record<string, unknown>
): Promise<ActivityLog> {
  return logActivity({
    task_id: taskId,
    action: 'task_updated',
    entity_type: 'task',
    entity_id: taskId,
    details: JSON.stringify(changes),
  });
}

/**
 * Log task deletion
 */
export async function logTaskDeleted(taskId: number): Promise<ActivityLog> {
  return logActivity({
    task_id: taskId,
    action: 'task_deleted',
    entity_type: 'task',
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
): Promise<ActivityLog> {
  return logActivity({
    task_id: taskId,
    action: 'comment_added',
    entity_type: 'comment',
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
  return logActivity({
    task_id: taskId,
    action: 'task_assigned',
    entity_type: 'task',
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
  permission: 'view' | 'edit'
): Promise<ActivityLog> {
  return logActivity({
    task_id: taskId,
    action: 'task_shared',
    entity_type: 'share',
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
  return logActivity({
    user_id: userId,
    action: 'notification_sent',
    entity_type: 'notification',
    details: JSON.stringify({ type, ...data }),
  });
}

// Backward compatibility alias
export const logActivityDb = logActivity;
