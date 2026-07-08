"use server";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { logTaskAction } from "@/lib/actions/task-helpers";

interface TaskDependency {
  id: number;
  task_id: number;
  depends_on_task_id: number;
  created_at: string;
}

/**
 * Check if adding a dependency would create a circular dependency
 */
async function wouldCreateCircularDependency(
  taskId: number,
  dependsOnTaskId: number,
  db: ReturnType<typeof getDb>
): Promise<boolean> {
  if (taskId === dependsOnTaskId) {
    return true;
  }

  const result = db.prepare(`
    WITH RECURSIVE dependent_tasks AS (
      SELECT task_id FROM task_dependencies WHERE depends_on_task_id = ?
      UNION ALL
      SELECT td.task_id
      FROM task_dependencies td
      INNER JOIN dependent_tasks dt ON td.depends_on_task_id = dt.task_id
    )
    SELECT 1 FROM dependent_tasks WHERE task_id = ?
  `).get(dependsOnTaskId, taskId);

  return !!result;
}

export async function addTaskDependency(taskId: number, dependsOnTaskId: number): Promise<TaskDependency> {
  const db = getDb();
  const user = await getCurrentUser();

  // Verify user owns both tasks
  if (user?.id) {
    const task1 = db.prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?").get(taskId, user.id);
    const task2 = db.prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?").get(dependsOnTaskId, user.id);
    if (!task1 || !task2) {
      throw new Error("Access denied - cannot add dependency to task you don't own");
    }
  }

  const isCircular = await wouldCreateCircularDependency(taskId, dependsOnTaskId, db);
  if (isCircular) {
    throw new Error("This dependency would create a circular reference");
  }

  const existing = db.prepare(
    "SELECT id FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?"
  ).get(taskId, dependsOnTaskId);

  if (existing) {
    throw new Error("Dependency already exists");
  }

  const result = db
    .prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)")
    .run(taskId, dependsOnTaskId);

  logTaskAction(taskId, "dependency_added", `Task now blocked by task ${dependsOnTaskId}`);

  return {
    id: Number(result.lastInsertRowid),
    task_id: taskId,
    depends_on_task_id: dependsOnTaskId,
    created_at: new Date().toISOString(),
  };
}

export async function removeTaskDependency(taskId: number, dependsOnTaskId: number): Promise<void> {
  const db = getDb();
  const user = await getCurrentUser();

  // Only remove dependency if user owns the task
  if (user?.id) {
    db.prepare(`
      DELETE FROM task_dependencies
      WHERE task_id = ? AND depends_on_task_id = ?
      AND task_id IN (SELECT id FROM tasks WHERE user_id = ?)
    `).run(taskId, dependsOnTaskId, user.id);
  } else {
    db.prepare("DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?").run(taskId, dependsOnTaskId);
  }
}

export async function getBlockedTasks() {
  const { getTasks } = await import("./tasks");
  const db = getDb();
  const blockedTaskIds = db
    .prepare(`SELECT DISTINCT task_id FROM task_dependencies`)
    .all()
    .map((r: { task_id: number }) => r.task_id);

  if (blockedTaskIds.length === 0) return [];

  const tasks = await getTasks({ includeCompleted: true });
  return tasks.filter((t) => blockedTaskIds.includes(t.id));
}