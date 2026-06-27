"use server";

import { getDb } from "@/lib/db";
import { sendTaskReminderEmail, sendDueSoonEmail } from "@/lib/email";
import type { Task } from "@/types";

interface TaskRow {
  id: number;
  name: string;
  description: string | null;
  deadline: string | null;
  date: string | null;
  user_email: string;
}

/**
 * API endpoint to send task-related notifications
 * This would typically be called by a scheduled job or on-task-change trigger
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, taskId, userId } = body;

    const db = getDb();

    if (type === "reminder") {
      const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Partial<Task> | null;
      const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as { email: string } | null;

      if (task && user) {
        await sendTaskReminderEmail(user.email, task as Task);
      }
    }

    if (type === "due_soon") {
      const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Partial<Task> | null;
      const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as { email: string } | null;

      if (task && user) {
        await sendDueSoonEmail(user.email, task as Task);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Notification error:", error);
    return Response.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}

/**
 * GET handler to process pending reminders
 * This would be called by a cron job
 */
export async function GET() {
  try {
    const db = getDb();
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Find tasks due today or overdue
    const tasks = db
      .prepare(
        `SELECT t.*, u.email as user_email
         FROM tasks t
         JOIN task_shares ts ON t.id = ts.task_id
         JOIN users u ON ts.user_id = u.id
         WHERE t.deadline IS NOT NULL
         AND t.completed = 0
         AND t.deadline <= ?
         AND ts.permission = 'edit'`
      )
      .all(today) as TaskRow[];

    let sentCount = 0;
    for (const task of tasks) {
      const taskData: Task = {
        id: task.id,
        name: task.name,
        description: task.description,
        notes: null,
        list_id: 1,
        date: task.date,
        deadline: task.deadline,
        estimate: null,
        actual_time: null,
        priority: "medium",
        recurring: "none",
        recurring_config: null,
        completed: false,
        completed_at: null,
        created_at: "",
        updated_at: "",
        sort_order: 0,
      };
      await sendDueSoonEmail(task.user_email, taskData);
      sentCount++;
    }

    return Response.json({ sent: sentCount });
  } catch (error) {
    console.error("Notification processing error:", error);
    return Response.json(
      { error: "Failed to process notifications" },
      { status: 500 }
    );
  }
}