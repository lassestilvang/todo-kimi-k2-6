"use server";

import { getDb } from "@/lib/db";
import type { Task } from "@/types";
import { logActivity as logActivityDb } from "@/lib/actions/activity-logger";

/**
 * Real-time task update server actions
 * Broadcasts updates to WebSocket subscribers
 */

// In-memory store for active channels (in production, use Redis)
const activeChannels = new Map<string, Set<number>>();

/**
 * Broadcast a task update to all subscribers
 * @param taskId - The ID of the task being updated
 * @param userId - The ID of the user performing the action
 * @param data - The task data to broadcast (can include custom properties for different action types)
 * @param action - The type of action being performed
 */
export async function broadcastTaskUpdate(
  taskId: number,
  userId: number,
  data: Partial<Task> & Record<string, unknown>,
  action: 'created' | 'updated' | 'deleted' | 'completed'
): Promise<void> {
  try {
    const db = getDb();

    // Get workspace members for this task
    const workspaceMembers = db
      .prepare(`
        SELECT DISTINCT u.id as userId, u.name as userName, u.email
        FROM users u
        INNER JOIN task_shares ts ON ts.user_id = u.id
        WHERE ts.task_id = ?
      `)
      .all(taskId);

    // Get task details for context
    const task = db
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(taskId) as Task | undefined;

    if (!task) return;

    // Broadcast to WebSocket clients
    const channel = `task:${taskId}`;

    // Update presence/activity
    await logActivityDb({
      task_id: taskId,
      action,
      entity_type: "task",
      entity_id: taskId,
      details: JSON.stringify(data),
    });

    // Subscribe users to activity channel so they receive updates
    for (const member of workspaceMembers as { userId: number; userName: string; email: string }[]) {
      activeChannels.get(channel)?.add(member.userId);
    }

    // Try to broadcast via WebSocket if the hub is available
    try {
      // Dynamic import to avoid issues when WebSocket server isn't running
      const { wsHub } = await import("@/lib/ws-server");
      if (wsHub && typeof wsHub.broadcastToChannel === 'function') {
        wsHub.broadcastToChannel(channel, {
          type: 'task_update',
          taskId,
          action,
          userId,
          ...data,
        });
      }
    } catch (wsError) {
      // WebSocket server not available in this environment
      // The update will still be logged in the database
    }

    // Notify subscribers via activity channel
    activeChannels.forEach((users, ch) => {
      if (ch === channel || ch === 'global') {
        for (const userId of users) {
          activeChannels.get(`user:${userId}`)?.add(userId);
        }
      }
    });

  } catch (error) {
    console.error('Failed to broadcast task update:', error);
  }
}

/**
 * Log activity for real-time updates
 * Re-exported from activity-logger for backward compatibility
 */
export async function logActivity(input: {
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  details?: string;
}): Promise<void> {
  await logActivityDb({
    task_id: input.entity_id || 0,
    user_id: input.user_id,
    action: input.action,
    entity_type: input.entity_type as "task" | "list" | "label" | "template" | "user" | "notification" | "comment" | "share",
    entity_id: input.entity_id || 0,
    details: input.details,
  });
}

/**
 * Subscribe a user to real-time updates for a task
 */
export async function subscribeToTask(userId: number, taskId: number): Promise<void> {
  const channel = `task:${taskId}`;
  if (!activeChannels.has(channel)) {
    activeChannels.set(channel, new Set());
  }
  activeChannels.get(channel)?.add(userId);

  // Also subscribe to user channel
  const userChannel = `user:${userId}`;
  if (!activeChannels.has(userChannel)) {
    activeChannels.set(userChannel, new Set());
  }
  activeChannels.get(userChannel)?.add(userId);
}

/**
 * Unsubscribe a user from real-time updates for a task
 */
export async function unsubscribeFromTask(userId: number, taskId: number): Promise<void> {
  const channel = `task:${taskId}`;
  activeChannels.get(channel)?.delete(userId);
}

/**
 * Get all subscribers for a task
 */
export async function getTaskSubscribers(taskId: number): Promise<number[]> {
  const channel = `task:${taskId}`;
  const subscribers = activeChannels.get(channel);
  return subscribers ? Array.from(subscribers) : [];
}

/**
 * Send a real-time notification to a user
 */
export async function sendNotification(
  userId: number,
  type: 'task_update' | 'task_mention' | 'task_comment',
  data: Record<string, unknown>
): Promise<void> {
  // In a real implementation, this would send via WebSocket or push notification
  // For now, we just log the notification
  await logActivity({
    user_id: userId,
    action: 'notification_sent',
    entity_type: 'notification',
    entity_id: 0,
    details: JSON.stringify({ type, ...data }),
  });
}

/**
 * Validate task edit permissions
 */
export async function canEditTask(userId: number, taskId: number): Promise<boolean> {
  const db = getDb();

  // Check if user owns the task
  const task = db
    .prepare("SELECT user_id FROM tasks WHERE id = ?")
    .get(taskId) as { user_id: number | null } | undefined;

  if (!task) return false;

  // Owner can always edit
  if (task.user_id === userId) return true;

  // Check for edit permissions via task share
  const share = db
    .prepare("SELECT permission FROM task_shares WHERE task_id = ? AND user_id = ?")
    .get(taskId, userId) as { permission: string } | undefined;

  return share?.permission === 'edit';
}