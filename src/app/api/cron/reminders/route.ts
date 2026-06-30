"use server";

import { getDb } from "@/lib/db";
import { sendTaskReminderEmail, sendDueSoonEmail, sendWeeklyDigest } from "@/lib/email";
import { format, subDays, startOfDay } from "date-fns";

/**
 * Cron job to send task reminders
 * Run every hour to check for upcoming deadlines
 */
export async function GET() {
  try {
    const db = getDb();
    const now = new Date();
    const today = format(startOfDay(now), "yyyy-MM-dd");

    // Get tasks with reminders due today
    const dueTodayTasks = db
      .prepare(`
        SELECT t.*, r.remind_at, u.email, u.name
        FROM tasks t
        JOIN reminders r ON t.id = r.task_id
        JOIN users u ON t.assignee_id = u.id
        WHERE t.completed = 0
        AND date(t.deadline) <= ?
        AND r.remind_at <= ?
      `)
      .all(today, now.toISOString()) as any[];

    // Send reminders
    let sentCount = 0;
    for (const task of dueTodayTasks) {
      if (task.email) {
        await sendTaskReminderEmail(task.email, task);
        sentCount++;
      }
    }

    // Get overdue tasks
    const overdueTasks = db
      .prepare(`
        SELECT t.*, u.email
        FROM tasks t
        JOIN users u ON t.assignee_id = u.id
        WHERE t.completed = 0
        AND t.deadline < ?
      `)
      .all(today) as any[];

    for (const task of overdueTasks) {
      if (task.email) {
        await sendDueSoonEmail(task.email, task);
        sentCount++;
      }
    }

    // Send weekly digest (on Sundays)
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0) {
      const users = db
        .prepare("SELECT email, name FROM users WHERE email IS NOT NULL")
        .all() as any[];

      for (const user of users) {
        const userTasks = db
          .prepare("SELECT * FROM tasks WHERE assignee_id = ?")
          .all(user.id) as any[];

        const summary = {
          totalTasks: userTasks.length,
          completedTasks: userTasks.filter((t: any) => t.completed).length,
          overdueTasks: userTasks.filter((t: any) => !t.completed && new Date(t.deadline) < now).length,
          criticalTasks: userTasks.filter((t: any) => t.priority === "critical" && !t.completed).length,
        };

        await sendWeeklyDigest(user.email, summary);
      }
    }

    return Response.json({ success: true, sent: sentCount });
  } catch (error) {
    console.error("Cron job error:", error);
    return Response.json({ error: "Cron job failed" }, { status: 500 });
  }
}
