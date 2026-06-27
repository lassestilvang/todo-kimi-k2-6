"use server";

import { getDb } from "@/lib/db";
import { sendTaskReminderEmail, sendDueSoonEmail } from "@/lib/email";
import type { Task } from "@/types";

interface TaskWithReminder {
  id: number;
  name: string;
  description: string | null;
  deadline: string | null;
  date: string | null;
  user_email: string;
  remind_at: string;
}

interface DueSoonTask {
  id: number;
  name: string;
  description: string | null;
  deadline: string;
  date: string | null;
  user_email: string;
}

/**
 * Cron endpoint for sending task reminders
 * Call this endpoint periodically (e.g., every hour) to send reminders
 * Can be triggered by a cron job or scheduler service
 */
export async function GET() {
  try {
    const db = getDb();
    const now = new Date();

    // Find tasks with reminders due in the next hour
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Get tasks with reminders
    const tasksWithReminders = db
      .prepare(
        `SELECT t.*, r.remind_at, u.email as user_email
         FROM tasks t
         JOIN reminders r ON t.id = r.task_id
         JOIN task_shares ts ON t.id = ts.task_id
         JOIN users u ON ts.user_id = u.id
         WHERE r.remind_at BETWEEN ? AND ?
         AND t.completed = 0
         AND ts.permission = 'edit'`
      )
      .all(now.toISOString(), oneHourFromNow.toISOString()) as TaskWithReminder[];

    let sentCount = 0;
    let errorCount = 0;

    for (const task of tasksWithReminders) {
      try {
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
        await sendTaskReminderEmail(task.user_email, taskData);
        sentCount++;

        // Delete the reminder after sending
        db.prepare("DELETE FROM reminders WHERE task_id = ?").run(task.id);
      } catch {
        errorCount++;
      }
    }

    // Also check for due-soon tasks
    const today = now.toISOString().split("T")[0];
    const dueSoonTasks = db
      .prepare(
        `SELECT t.*, u.email as user_email
         FROM tasks t
         JOIN task_shares ts ON t.id = ts.task_id
         JOIN users u ON ts.user_id = u.id
         WHERE t.deadline = ?
         AND t.completed = 0
         AND ts.permission = 'edit'`
      )
      .all(today) as DueSoonTask[];

    for (const task of dueSoonTasks) {
      try {
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
      } catch {
        errorCount++;
      }
    }

    return Response.json({
      success: true,
      sent: sentCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return Response.json(
      { error: "Failed to process reminders" },
      { status: 500 }
    );
  }
}