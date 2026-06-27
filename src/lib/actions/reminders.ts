"use server";

import { getDb } from "@/lib/db";
import type { Reminder } from "@/types";

/**
 * Get all reminders for a specific task
 */
export async function getReminders(taskId: number): Promise<Reminder[]> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM reminders WHERE task_id = ? ORDER BY remind_at ASC")
    .all(taskId) as Reminder[];
}

/**
 * Get upcoming reminders across all tasks
 */
export async function getUpcomingReminders(limit: number = 10): Promise<
  Array<Reminder & { task_name: string; task_completed: number }>
> {
  const db = getDb();
  return db
    .prepare(
      `SELECT r.*, t.name as task_name, t.completed as task_completed
       FROM reminders r
       JOIN tasks t ON r.task_id = t.id
       WHERE r.remind_at >= datetime('now')
       ORDER BY r.remind_at ASC
       LIMIT ?`
    )
    .all(limit) as Array<Reminder & { task_name: string; task_completed: number }>;
}

/**
 * Create a new reminder for a task
 */
export async function createReminder(input: {
  task_id: number;
  remind_at: string;
}): Promise<Reminder> {
  const db = getDb();

  // Verify task exists
  const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(input.task_id);
  if (!task) {
    throw new Error("Task not found");
  }

  const result = db
    .prepare("INSERT INTO reminders (task_id, remind_at) VALUES (?, ?)")
    .run(input.task_id, input.remind_at);

  return {
    id: Number(result.lastInsertRowid),
    task_id: input.task_id,
    remind_at: input.remind_at,
    created_at: new Date().toISOString(),
  };
}

/**
 * Update a reminder
 */
export async function updateReminder(id: number, updates: Partial<Omit<Reminder, "id" | "task_id" | "created_at">>): Promise<Reminder> {
  const db = getDb();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.remind_at !== undefined) {
    fields.push("remind_at = ?");
    values.push(updates.remind_at);
  }

  if (fields.length === 0) {
    throw new Error("No fields to update");
  }

  values.push(id);
  db.prepare(`UPDATE reminders SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  const reminder = db.prepare("SELECT * FROM reminders WHERE id = ?").get(id) as Reminder;
  if (!reminder) {
    throw new Error("Reminder not found");
  }

  return reminder;
}

/**
 * Delete a reminder
 */
export async function deleteReminder(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM reminders WHERE id = ?").run(id);
}

/**
 * Delete all reminders for a task
 */
export async function deleteRemindersForTask(taskId: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM reminders WHERE task_id = ?").run(taskId);
}

/**
 * Check and get reminders that are due
 * Returns reminders that should trigger notifications
 */
export async function getDueReminders(): Promise<
  Array<Reminder & { task_name: string }>
> {
  const db = getDb();
  const now = new Date().toISOString();

  return db
    .prepare(
      `SELECT r.*, t.name as task_name
       FROM reminders r
       JOIN tasks t ON r.task_id = t.id
       WHERE r.remind_at <= ? AND t.completed = 0`
    )
    .all(now) as Array<Reminder & { task_name: string }>;
}

/**
 * Snooze a reminder to a new time
 */
export async function snoozeReminder(id: number, minutes: number): Promise<Reminder> {
  const db = getDb();
  const current = db.prepare("SELECT remind_at FROM reminders WHERE id = ?").get(id) as Reminder | undefined;

  if (!current) {
    throw new Error("Reminder not found");
  }

  const newTime = new Date(new Date(current.remind_at).getTime() + minutes * 60000);

  return updateReminder(id, { remind_at: newTime.toISOString() });
}