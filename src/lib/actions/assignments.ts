"use server";

import { getDb } from "@/lib/db";
import { getTasksByIds } from "./tasks";
import type { TaskWithRelations } from "@/types";

export async function getTaskAssignments(taskId: number): Promise<Array<{ user_id: number; user_email: string; user_name: string | null; permission: "view" | "edit" }>> {
  const db = getDb();
  return db
    .prepare(
      `SELECT ta.user_id, u.email as user_email, u.name as user_name, ta.permission
       FROM task_shares ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = ?`
    )
    .all(taskId) as Array<{ user_id: number; user_email: string; user_name: string | null; permission: "view" | "edit" }>;
}

export async function assignTask(taskId: number, userId: number, permission: "view" | "edit" = "view"): Promise<void> {
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO task_shares (task_id, user_id, permission) VALUES (?, ?, ?)")
    .run(taskId, userId, permission);
}

export async function unassignTask(taskId: number, userId: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM task_shares WHERE task_id = ? AND user_id = ?").run(taskId, userId);
}

export async function getTasksAssignedToUser(userId: number): Promise<TaskWithRelations[]> {
  const db = getDb();
  const taskIds = db
    .prepare("SELECT task_id FROM task_shares WHERE user_id = ? AND permission = 'edit'")
    .all(userId)
    .map((r: { task_id: number }) => r.task_id);

  if (taskIds.length === 0) return [];
  return getTasksByIds(taskIds);
}

export async function getPendingAssignments(userId: number): Promise<TaskWithRelations[]> {
  const db = getDb();
  const taskIds = db
    .prepare("SELECT task_id FROM task_shares WHERE user_id = ? AND permission = 'edit'")
    .all(userId)
    .map((r: { task_id: number }) => r.task_id);

  if (taskIds.length === 0) return [];

  const tasks = await getTasksByIds(taskIds);
  return tasks.filter(t => !t.completed);
}