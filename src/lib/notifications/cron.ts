/**
 * Scheduled notification system
 * Handles sending reminder emails and digest summaries
 */

import { getDb } from "../db";
import { sendTaskReminderEmail, sendDueSoonEmail, sendWeeklyDigest, getUserNotificationSettings } from "../email";

/**
 * Check for tasks due today and send reminders
 * Should be called once per day (cron: 0 9 * * *)
 */
export async function checkDueTasks(): Promise<number> {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];
  const now = Date.now();

  // Get tasks due today
  const dueTodayTasks = db
    .prepare(
      "SELECT t.id, t.name, t.description, t.deadline, t.priority, t.user_id FROM tasks t WHERE date = ? AND completed = 0"
    )
    .all(today) as Array<{ id: number; name: string; description: string | null; deadline: string | null; priority: string; user_id: number }>;

  let sentCount = 0;

  for (const task of dueTodayTasks) {
    const settings = await getUserNotificationSettings();
    if (!settings.dueDateReminders) continue;

    // Get user email
    const user = db.prepare("SELECT email, name FROM users WHERE id = ?").get(task.user_id) as
      | { email: string; name: string }
      | undefined;

    if (user?.email) {
      const success = await sendDueSoonEmail(user.email, {
        id: task.id,
        name: task.name,
        description: task.description,
        deadline: task.deadline,
        priority: task.priority as "critical" | "high" | "medium" | "low" | "none",
      });
      if (success) sentCount++;
    }
  }

  return sentCount;
}

/**
 * Check for overdue tasks and send notifications
 * Should be called once per day (cron: 0 9 * * *)
 */
export async function checkOverdueTasks(): Promise<number> {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  // Get overdue tasks
  const overdueTasks = db
    .prepare(
      "SELECT t.id, t.name, t.description, t.deadline, t.priority, t.user_id FROM tasks t WHERE date < ? AND completed = 0"
    )
    .all(today) as Array<{ id: number; name: string; description: string | null; deadline: string | null; priority: string; user_id: number }>;

  let sentCount = 0;

  for (const task of overdueTasks) {
    const settings = await getUserNotificationSettings();
    if (!settings.overdueReminders) continue;

    // Get user email
    const user = db.prepare("SELECT email, name FROM users WHERE id = ?").get(task.user_id) as
      | { email: string; name: string }
      | undefined;

    if (user?.email) {
      const success = await sendTaskReminderEmail(user.email, {
        id: task.id,
        name: task.name,
        description: task.description,
        deadline: task.deadline,
        priority: task.priority as "critical" | "high" | "medium" | "low" | "none",
      });
      if (success) sentCount++;
    }
  }

  return sentCount;
}

/**
 * Generate and send weekly digests to all users
 * Should be called once per week (cron: 0 9 * * 1)
 */
export async function sendWeeklyDigests(): Promise<number> {
  const db = getDb();
  const users = db.prepare("SELECT id, email, name FROM users").all() as Array<{ id: number; email: string; name: string }>;

  let sentCount = 0;

  for (const user of users) {
    const settings = await getUserNotificationSettings();
    if (!settings.dailySummary) continue;

    // Get user's task stats
    const tasks = db
      .prepare(
        "SELECT id, name, completed, priority, deadline FROM tasks WHERE user_id = ?"
      )
      .all(user.id) as Array<{ id: number; name: string; completed: boolean; priority: string; deadline: string | null }>;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const overdueTasks = tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && !t.completed).length;
    const criticalTasks = tasks.filter((t) => t.priority === "critical" && !t.completed).length;

    if (user.email) {
      const success = await sendWeeklyDigest(user.email, {
        totalTasks,
        completedTasks,
        overdueTasks,
        criticalTasks,
      });
      if (success) sentCount++;
    }
  }

  return sentCount;
}

/**
 * Run all notification checks
 * This is the main entry point for the notification cron job
 */
export async function runNotifications(): Promise<{
  dueToday: number;
  overdue: number;
  weeklyDigests: number;
}> {
  const [dueToday, overdue, weeklyDigests] = await Promise.all([
    checkDueTasks(),
    checkOverdueTasks(),
    sendWeeklyDigests(),
  ]);

  return { dueToday, overdue, weeklyDigests };
}