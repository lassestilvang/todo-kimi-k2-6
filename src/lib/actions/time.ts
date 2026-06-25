"use server";

import { getDb } from "@/lib/db";
import { z } from "zod";
import type { TimeEntry, CreateTimeEntryInput } from "@/types";

// Time entry validation schema
const timeEntrySchema = z.object({
  task_id: z.number().positive("Task ID must be a positive number"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().optional().nullable(),
  duration_seconds: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
});

export async function getTimeEntries(taskId: number): Promise<TimeEntry[]> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM time_entries WHERE task_id = ? ORDER BY created_at DESC")
    .all(taskId) as TimeEntry[];
}

export async function addTimeEntry(input: CreateTimeEntryInput): Promise<TimeEntry> {
  // Validate input
  const parsed = timeEntrySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid time entry data");
  }

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO time_entries (task_id, start_time, end_time, duration_seconds, description)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      parsed.data.task_id,
      parsed.data.start_time,
      parsed.data.end_time || null,
      parsed.data.duration_seconds || null,
      parsed.data.description || null
    );
  return {
    id: Number(result.lastInsertRowid),
    task_id: parsed.data.task_id,
    start_time: parsed.data.start_time,
    end_time: parsed.data.end_time || null,
    duration_seconds: parsed.data.duration_seconds || null,
    description: parsed.data.description || null,
    created_at: new Date().toISOString(),
  };
}

export async function updateTimeEntry(id: number, updates: Partial<CreateTimeEntryInput>): Promise<TimeEntry> {
  // Validate id
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid time entry ID");
  }

  // Validate updates if provided
  if (Object.keys(updates).length > 0) {
    const parsed = timeEntrySchema.partial().safeParse(updates);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid time entry data");
    }
  }

  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.start_time !== undefined) {
    fields.push("start_time = ?");
    values.push(updates.start_time);
  }
  if (updates.end_time !== undefined) {
    fields.push("end_time = ?");
    values.push(updates.end_time || null);
  }
  if (updates.duration_seconds !== undefined) {
    fields.push("duration_seconds = ?");
    values.push(updates.duration_seconds);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description || null);
  }

  if (fields.length === 0) throw new Error("No fields to update");

  values.push(id);
  const result = db.prepare(`UPDATE time_entries SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  if (result.changes === 0) {
    throw new Error("Time entry not found");
  }

  const entry = db.prepare("SELECT * FROM time_entries WHERE id = ?").get(id) as TimeEntry;
  return entry;
}

export async function deleteTimeEntry(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM time_entries WHERE id = ?").run(id);
}