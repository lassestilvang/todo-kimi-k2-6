"use server";

import { getDb } from "@/lib/db";
import type { TimeEntry } from "@/types";

export interface TimeReport {
  taskId: number;
  taskName: string;
  totalSeconds: number;
  entries: TimeEntry[];
}

export async function getTimeReport(options?: {
  startDate?: string;
  endDate?: string;
  taskId?: number;
}): Promise<TimeReport[]> {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.taskId) {
    conditions.push("task_id = ?");
    params.push(options.taskId);
  }
  if (options?.startDate) {
    conditions.push("created_at >= ?");
    params.push(options.startDate);
  }
  if (options?.endDate) {
    conditions.push("created_at <= ?");
    params.push(options.endDate);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const entries = db
    .prepare(`SELECT * FROM time_entries ${where} ORDER BY task_id, created_at`)
    .all(...params) as TimeEntry[];

  const byTask = entries.reduce((acc, entry) => {
    if (!acc[entry.task_id]) {
      acc[entry.task_id] = [];
    }
    acc[entry.task_id].push(entry);
    return acc;
  }, {} as Record<number, TimeEntry[]>);

  const taskIds = Object.keys(byTask).map(Number);
  const tasks = taskIds.length > 0
    ? (await db.prepare(`SELECT id, name FROM tasks WHERE id IN (${taskIds.map(() => "?").join(",")})`).all(...taskIds) as { id: number; name: string }[])
    : [];

  const taskNames = new Map(tasks.map(t => [t.id, t.name]));

  return Object.entries(byTask).map(([taskId, entries]) => ({
    taskId: Number(taskId),
    taskName: taskNames.get(Number(taskId)) || "Unknown",
    totalSeconds: entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0),
    entries,
  }));
}

export async function getWeeklyTimeSummary(): Promise<{
  totalSeconds: number;
  byDay: Record<string, number>;
  topTasks: { taskId: number; taskName: string; seconds: number }[];
}> {
  const db = getDb();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const entries = db
    .prepare(`SELECT task_id, duration_seconds, created_at FROM time_entries WHERE created_at >= ? AND duration_seconds IS NOT NULL`)
    .all(weekAgo) as TimeEntry[];

  const totalSeconds = entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);

  const byDay: Record<string, number> = {};
  for (const entry of entries) {
    const day = entry.created_at.split("T")[0];
    byDay[day] = (byDay[day] || 0) + (entry.duration_seconds || 0);
  }

  const byTask = entries.reduce((acc, e) => {
    acc[e.task_id] = (acc[e.task_id] || 0) + (e.duration_seconds || 0);
    return acc;
  }, {} as Record<number, number>);

  const sortedTasks = Object.entries(byTask)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const taskNames = await db
    .prepare(`SELECT id, name FROM tasks WHERE id IN (${sortedTasks.map(([id]) => id).join(",")})`)
    .all(...sortedTasks.map(([id]) => Number(id))) as { id: number; name: string }[];

  const topTasks = sortedTasks.map(([taskId, seconds]) => ({
    taskId: Number(taskId),
    taskName: taskNames.find(t => t.id === Number(taskId))?.name || "Unknown",
    seconds,
  }));

  return { totalSeconds, byDay, topTasks };
}