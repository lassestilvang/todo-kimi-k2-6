'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export interface AfterlifeEntry {
  id: number;
  original_task_id: number | null;
  user_id: number;
  name: string;
  description: string | null;
  priority: string | null;
  completed_count: number;
  last_completed_at: string | null;
  resurrect_count: number;
  resurrected_as_task_id: number | null;
  created_at: string;
  deleted_at: string;
  tags: string | null;
}

/**
 * Soft-delete a task: copy it into task_afterlife for archaeology, then remove.
 * We keep the original name and metadata so we can spot recurring patterns
 * (e.g. "you delete 'plan weekend' every Friday").
 */
export async function softDeleteTask(taskId: number, reason?: string): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;

  return db.transaction(() => {
    const task = db
      .prepare(
        `SELECT * FROM tasks WHERE id = ? AND user_id = ?`
      )
      .get(taskId, user.id) as
      | {
          id: number;
          name: string;
          description: string | null;
          priority: string;
          created_at: string;
          completed_at: string | null;
          completed: number;
        }
      | undefined;

    if (!task) return false;

    // Find label names for tags column
    const labels = db
      .prepare(
        `SELECT l.name FROM labels l
         JOIN task_labels tl ON tl.label_id = l.id
         WHERE tl.task_id = ?`
      )
      .all(taskId) as Array<{ name: string }>;
    const tags = labels.map(l => l.name).join(',') || null;

    db.prepare(
      `INSERT INTO task_afterlife
         (original_task_id, user_id, name, description, priority,
          completed_count, last_completed_at, created_at, tags, deleted_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      task.id,
      user.id,
      task.name,
      task.description,
      task.priority,
      task.completed,
      task.completed_at,
      task.created_at,
      tags,
      reason ?? null
    );

    // Bump resurrection counter if same name deleted before
    db.prepare(
      `UPDATE task_afterlife
       SET resurrect_count = resurrect_count + 1
       WHERE user_id = ? AND name = ? AND id != last_insert_rowid()`
    ).run(user.id, task.name);

    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    return true;
  }) as boolean;
}

export async function listAfterlife(limit = 30): Promise<AfterlifeEntry[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];
  return db
    .prepare(
      `SELECT * FROM task_afterlife WHERE user_id = ?
       ORDER BY deleted_at DESC LIMIT ?`
    )
    .all(user.id, limit) as AfterlifeEntry[];
}

export interface AfterlifePattern {
  name: string;
  times_deleted: number;
  times_resurrected: number;
  last_deleted: string;
  suggestion: string;
}

/**
 * Detect names that recur in the afterlife → user is fighting the same task.
 */
export async function findAfterlifePatterns(): Promise<AfterlifePattern[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];

  const rows = db
    .prepare(
      `SELECT name,
              COUNT(*) AS deletions,
              SUM(resurrect_count) AS resurrections,
              MAX(deleted_at) AS last_deleted
       FROM task_afterlife
       WHERE user_id = ?
       GROUP BY name
       HAVING COUNT(*) >= 2
       ORDER BY deletions DESC, resurrections DESC
       LIMIT 20`
    )
    .all(user.id) as Array<{
      name: string;
      deletions: number;
      resurrections: number | null;
      last_deleted: string;
    }>;

  return rows.map(r => ({
    name: r.name,
    times_deleted: r.deletions,
    times_resurrected: r.resurrections ?? 0,
    last_deleted: r.last_deleted,
    suggestion:
      r.resurrections && r.resurrections > 0
        ? `You've deleted "${r.name}" ${r.deletions} times and resurrected it ${r.resurrections}× — make it a template?`
        : `You've deleted "${r.name}" ${r.deletions} times — consider dropping it permanently or making it a recurring task.`,
  }));
}
