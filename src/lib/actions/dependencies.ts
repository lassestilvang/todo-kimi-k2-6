"use server";

import { getDb } from "@/lib/db";
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
  db.prepare("DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?").run(taskId, dependsOnTaskId);
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