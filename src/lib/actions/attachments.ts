"use server";

import { getDb } from "@/lib/db";
import type { TaskAttachment, CreateAttachmentInput } from "@/types";

export async function getTaskAttachments(taskId: number): Promise<TaskAttachment[]> {
  const db = getDb();
  // Note: Task ownership is verified in the API route
  return db
    .prepare("SELECT * FROM task_attachments WHERE task_id = ? ORDER BY created_at DESC")
    .all(taskId) as TaskAttachment[];
}

export async function addTaskAttachment(input: CreateAttachmentInput): Promise<TaskAttachment> {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO task_attachments (task_id, filename, file_size, mime_type, url) VALUES (?, ?, ?, ?, ?)"
    )
    .run(input.task_id, input.filename, input.file_size, input.mime_type, input.url);
  return {
    id: Number(result.lastInsertRowid),
    task_id: input.task_id,
    filename: input.filename,
    file_size: input.file_size,
    mime_type: input.mime_type,
    url: input.url,
    created_at: new Date().toISOString(),
  };
}

export async function deleteTaskAttachment(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM task_attachments WHERE id = ?").run(id);
}