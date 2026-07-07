"use server";

import { getDb } from "@/lib/db";
import { sendTaskReminderEmail, sendDueSoonEmail, sendWeeklyDigest } from "@/lib/email";
import { format, startOfDay } from "date-fns";

// Local type for database results (completed is stored as integer 0/1)
interface DbTask {
  id: number;
  name: string;
  deadline: string | null;
  completed: number; // 0 or 1
  email?: string;
  remind_at?: string;
  assignee_id?: number | null;
  description?: string | null;
  priority?: string;
}

interface UserRecord {
  id: number;
  email: string;
  name?: string;
}

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
        SELECT t.id, t.name, t.deadline, t.completed, t.assignee_id, t.description,
               r.remind_at, u.email, u.name
        FROM tasks t
        JOIN reminders r ON t.id = r.task_id
        JOIN users u ON t.assignee_id = u.id
        WHERE t.completed = 0
        AND date(t.deadline) <= ?
        AND r.remind_at <= ?
      `)
      .all(today, now.toISOString()) as DbTask[];

    // Send reminders
    let sentCount = 0;
    for (const task of dueTodayTasks) {
      if (task.email) {
        await sendTaskReminderEmail(task.email, {
          id: task.id,
          name: task.name,
          description: task.description ?? null,
          notes: null,
          list_id: null,
          date: null,
          deadline: task.deadline ?? null,
          estimate: null,
          actual_time: null,
          priority: (task.priority as "critical" | "high" | "medium" | "low" | "none") ?? "none",
          recurring: "none",
          recurring_config: null,
          completed: task.completed === 1,
          completed_at: null,
          created_at: "",
          updated_at: "",
          sort_order: 0,
          labels: [],
          subtasks: [],
          reminders: [],
          logs: [],
          comments: [],
          attachments: [],
          blockers: [],
          blocked_by: [],
          time_entries: [],
          recurring_exceptions: [],
        });
        sentCount++;
      }
    }

    // Get overdue tasks
    const overdueTasks = db
      .prepare(`
        SELECT t.id, t.name, t.deadline, t.completed, u.email, t.priority
        FROM tasks t
        JOIN users u ON t.assignee_id = u.id
        WHERE t.completed = 0
        AND t.deadline < ?
      `)
      .all(today) as DbTask[];

    for (const task of overdueTasks) {
      if (task.email) {
        await sendDueSoonEmail(task.email, {
          id: task.id,
          name: task.name,
          description: null,
          notes: null,
          list_id: null,
          date: null,
          deadline: task.deadline ?? null,
          estimate: null,
          actual_time: null,
          priority: (task.priority as "critical" | "high" | "medium" | "low" | "none") ?? "none",
          recurring: "none",
          recurring_config: null,
          completed: task.completed === 1,
          completed_at: null,
          created_at: "",
          updated_at: "",
          sort_order: 0,
          labels: [],
          subtasks: [],
          reminders: [],
          logs: [],
          comments: [],
          attachments: [],
          blockers: [],
          blocked_by: [],
          time_entries: [],
          recurring_exceptions: [],
        });
        sentCount++;
      }
    }

    // Send weekly digest (on Sundays)
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0) {
      const users = db
        .prepare("SELECT email, name FROM users WHERE email IS NOT NULL")
        .all() as UserRecord[];

      for (const user of users) {
        const userTasks = db
          .prepare("SELECT * FROM tasks WHERE assignee_id = ?")
          .all(user.id) as DbTask[];

        const summary = {
          totalTasks: userTasks.length,
          completedTasks: userTasks.filter((t) => t.completed === 1).length,
          overdueTasks: userTasks.filter((t) => t.completed !== 1 && t.deadline && new Date(t.deadline) < now).length,
          criticalTasks: userTasks.filter((t) => t.priority === "critical" && t.completed !== 1).length,
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