"use server";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
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
  const user = await getCurrentUser();

  // User isolation: verify task ownership before returning comments
  if (user?.id) {
    const task = db.prepare("SELECT user_id FROM tasks WHERE id = ?").get(taskId) as { user_id: number } | undefined;
    if (!task || task.user_id !== user.id) {
      return []; // No access to this task's comments
    }
  }

  return db
    .prepare("SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC")
    .all(taskId) as TaskComment[];
}