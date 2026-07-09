import { getDb } from "@/lib/db";
import { sendTaskReminderEmail, sendDueSoonEmail, sendWeeklyDigest, shouldSendNotification } from "@/lib/email";
import { logError } from "@/lib/logger";
import { format, startOfDay } from "date-fns";

// Local type for database results (completed is stored as integer 0/1)
interface DbTask {
  id: number;
  name: string;
  deadline: string | null;
  completed: number; // 0 or 1
  email?: string;
  remind_at?: string;
  user_id?: number;
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

    // Get tasks with reminders due (properly joined with user table for user_id)
    const dueTasks = db
      .prepare(`
        SELECT t.id, t.name, t.deadline, t.completed, t.user_id, t.description,
               r.remind_at, u.email, u.name
        FROM tasks t
        JOIN reminders r ON t.id = r.task_id
        JOIN users u ON t.assignee_id = u.id OR t.user_id = u.id
        WHERE t.completed = 0
        AND date(t.deadline) <= ?
        AND r.remind_at <= ?
      `)
      .all(today, now.toISOString()) as DbTask[];

    // Send reminders with user isolation
    let sentCount = 0;
    for (const task of dueTasks) {
      if (!task.email || !task.user_id) continue;

      const shouldSend = await shouldSendNotification(task.user_id, { id: task.id, name: task.name, description: task.description ?? null, deadline: task.deadline ?? null, priority: task.priority as any }, "reminder");
      if (!shouldSend) continue;

      await sendTaskReminderEmail(task.email, {
        id: task.id,
        name: task.name,
        description: task.description ?? null,
        deadline: task.deadline ?? null,
      });
      sentCount++;
    }

    // Get overdue tasks with proper user filtering
    const overdueTasks = db
      .prepare(`
        SELECT t.id, t.name, t.deadline, t.completed, t.user_id, u.email, t.priority, t.description
        FROM tasks t
        JOIN users u ON t.assignee_id = u.id OR t.user_id = u.id
        WHERE t.completed = 0
        AND t.deadline < ?
      `)
      .all(today) as DbTask[];

    for (const task of overdueTasks) {
      if (!task.email || !task.user_id) continue;

      const shouldSend = await shouldSendNotification(task.user_id, { id: task.id, name: task.name, description: task.description ?? null, deadline: task.deadline ?? null, priority: task.priority as any }, "overdue");
      if (!shouldSend) continue;

      await sendDueSoonEmail(task.email, {
        id: task.id,
        name: task.name,
        description: task.description ?? null,
        deadline: task.deadline ?? null,
      });
      sentCount++;
    }

    // Send weekly digest (on Sundays)
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0) {
      const users = db
        .prepare("SELECT id, email, name FROM users WHERE email IS NOT NULL")
        .all() as UserRecord[];

      for (const user of users) {
        const settings = await shouldSendNotification(user.id, { id: 0, name: "" } as any, "due_soon");
        if (!settings) continue;

        const userTasks = db
          .prepare("SELECT * FROM tasks WHERE user_id = ?")
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
    logError("Cron job error", undefined, error instanceof Error ? error : new Error(String(error)));
    return Response.json({ error: "Cron job failed" }, { status: 500 });
  }
}