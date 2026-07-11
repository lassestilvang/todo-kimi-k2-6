/**
 * Notification System
 * Handles email and in-app notifications for tasks
 */

import { getDb } from "@/lib/db";
import { logInfo, logError } from "@/lib/logger";
import { sendTaskReminderEmail, sendDueSoonEmail, sendWeeklyDigest } from "@/lib/email";
import type { Reminder, Task, User } from "@/types";

/**
 * Get all users who have email notifications enabled
 */
export async function getUsersWithNotifications(): Promise<Array<User & { preferences: { notifications?: boolean } }>> {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = db
    .prepare(`
      SELECT u.*,
             json_extract(u.preferences, '$.notifications') as notifications_enabled
      FROM users u
    `)
    .all() as any as Array<User>;

  // Transform to expected format
  return users.map((u: User) => ({
    ...u,
    preferences: { notifications: true },
  }));
}

/**
 * Get reminder with task and user data
 */
export async function getReminderWithDetails(
  reminderId: number
): Promise<(Reminder & { task: Task; user: User }) | null> {
  const db = getDb();
  const result = db
    .prepare(
      `SELECT r.*, t.name as task_name, t.description as task_description,
              t.deadline as task_deadline, t.priority as task_priority,
              u.email as user_email, u.name as user_name, u.preferences
       FROM reminders r
       JOIN tasks t ON r.task_id = t.id
       JOIN users u ON t.assignee_id = u.id OR t.created_by = u.id
       WHERE r.id = ?`
    )
    .get(reminderId) as (Reminder & {
      task_name: string;
      task_description: string | null;
      task_deadline: string | null;
      task_priority: string;
      user_email: string;
      user_name: string;
      preferences: string;
    }) | null;

  if (!result) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    id: result.id,
    task_id: result.task_id,
    remind_at: result.remind_at,
    created_at: result.created_at,
    task: {
      id: result.task_id,
      name: result.task_name,
      description: result.task_description,
      deadline: result.task_deadline,
      priority: result.task_priority,
    } as any as Task,
    user: {
      id: 0,
      email: result.user_email,
      name: result.user_name,
      preferences: JSON.parse(result.preferences || "{}"),
    } as any as User,
  } as Reminder & { task: Task; user: User };
}

/**
 * Process due reminders and send notifications
 */
export async function processDueReminders(): Promise<{ sent: number; failed: number }> {
  const db = getDb();
  const now = new Date().toISOString();

  // Get reminders that are due
  const dueReminders = db
    .prepare(
      `SELECT r.*, t.name as task_name, t.description, t.deadline, t.priority,
              u.email as user_email, u.name as user_name, u.preferences
       FROM reminders r
       JOIN tasks t ON r.task_id = t.id
       JOIN users u ON t.assignee_id = u.id OR t.created_by = u.id
       WHERE r.remind_at <= ? AND t.completed = 0`
    )
    .all(now) as Array<Reminder & {
      task_name: string;
      description: string | null;
      deadline: string | null;
      priority: string;
      user_email: string;
      user_name: string;
      preferences: string;
    }>;

  let sent = 0;
  let failed = 0;

  for (const reminder of dueReminders) {
    try {
      const preferences = JSON.parse(reminder.preferences || "{}");

      // Check if user wants email notifications
      if (preferences.notifications !== false) {
        const task: Task = {
          id: reminder.task_id,
          name: reminder.task_name,
          description: reminder.description,
          deadline: reminder.deadline,
          priority: reminder.priority,
        } as Task;

        await sendTaskReminderEmail(reminder.user_email, task);
        logInfo(`Sent reminder email for task ${reminder.task_name} to ${reminder.user_email}`);
        sent++;
      }
    } catch (error) {
      logError(`Failed to send reminder for task ${reminder.task_name}`, undefined, error instanceof Error ? error : new Error(String(error)));
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send weekly digest to all active users
 */
export async function sendWeeklyDigestEmails(): Promise<{ sent: number; failed: number }> {
  const users = await getUsersWithNotifications();
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const preferences = user.preferences || {};

      if (preferences.notifications !== false) {
        const db = getDb();
        const tasks = db
          .prepare(
            `SELECT id, name, priority, deadline, completed,
                    CASE WHEN deadline IS NULL THEN 999
                         WHEN date(deadline) < date('now') THEN -1
                         ELSE cast((strftime('%s', deadline) - strftime('%s', 'now')) / 86400 as integer)
                    END as days_until_due
             FROM tasks
             WHERE (assignee_id = ? OR created_by = ?)`
          )
          .all(user.id, user.id) as Array<{
            id: number;
            name: string;
            priority: string;
            deadline: string | null;
            completed: number;
            days_until_due: number;
          }>;

        const summary = {
          totalTasks: tasks.length,
          completedTasks: tasks.filter(t => t.completed).length,
          overdueTasks: tasks.filter(t => t.days_until_due < 0 && !t.completed).length,
          criticalTasks: tasks.filter(t => t.priority === "critical" && !t.completed).length,
        };

        await sendWeeklyDigest(user.email, summary);
        logInfo(`Sent weekly digest to ${user.email}`);
        sent++;
      }
    } catch (error) {
      logError(`Failed to send weekly digest to ${user.email}`, undefined, error instanceof Error ? error : new Error(String(error)));
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Check for due dates and send notifications
 */
export async function checkDueDates(): Promise<{ dueSoon: number; overdue: number }> {
  const db = getDb();
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Get tasks due within 24 hours (but not today)
  const dueSoon = db
    .prepare(
      `SELECT t.*, u.email as user_email, u.name as user_name, u.preferences
       FROM tasks t
       JOIN users u ON t.assignee_id = u.id OR t.created_by = u.id
       WHERE t.deadline IS NOT NULL
       AND date(t.deadline) BETWEEN date(?) AND date(?)
       AND t.completed = 0`
    )
    .all(now.toISOString(), tomorrow.toISOString()) as Array<Task & { user_email: string; user_name: string; preferences: string }>;

  // Get overdue tasks
  const overdue = db
    .prepare(
      `SELECT t.*, u.email as user_email, u.name as user_name, u.preferences
       FROM tasks t
       JOIN users u ON t.assignee_id = u.id OR t.created_by = u.id
       WHERE t.deadline IS NOT NULL
       AND date(t.deadline) < date('now')
       AND t.completed = 0`
    )
    .all() as Array<Task & { user_email: string; user_name: string; preferences: string }>;

  let dueSoonCount = 0;
  let overdueCount = 0;

  // Send due soon notifications
  for (const task of dueSoon) {
    try {
      const preferences = JSON.parse(task.preferences || "{}");
      if (preferences.notifications !== false) {
        await sendDueSoonEmail(task.user_email, task);
        dueSoonCount++;
      }
    } catch (error) {
      logError(`Failed to send due soon notification`, undefined, error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Log overdue tasks
  for (const task of overdue) {
    logInfo(`Overdue task: ${task.name} (${task.deadline})`);
    overdueCount++;
  }

  return { dueSoon: dueSoonCount, overdue: overdueCount };
}