"use server";

import { getDb } from "@/lib/db";
import type { TaskComment, CreateCommentInput } from "@/types";

export async function addTaskComment(taskId: number, input: CreateCommentInput): Promise<TaskComment> {
  const db = getDb();
  const result = db
    .prepare("INSERT INTO task_comments (task_id, content) VALUES (?, ?)")
    .run(taskId, input.content);

  const comment: TaskComment = {
    id: Number(result.lastInsertRowid),
    task_id: taskId,
    content: input.content,
    created_at: new Date().toISOString(),
  };

  if (input.mentions && input.mentions.length > 0) {
    for (const userId of input.mentions) {
      db.prepare(
        "INSERT INTO comment_mentions (comment_id, user_id, task_id) VALUES (?, ?, ?)"
      ).run(result.lastInsertRowid, userId, taskId);
    }
  }

  return comment;
}

export async function getTaskComments(taskId: number): Promise<TaskComment[]> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC")
    .all(taskId) as TaskComment[];
}