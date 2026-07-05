import { NextRequest, NextResponse } from "next/server";
import { getDb, type Database } from "@/lib/db";
import { logInfo, logError } from "@/lib/logger";

/**
 * Bulk task operations API
 *
 * POST /api/tasks/bulk - Perform bulk operations on tasks
 * Body: { action: "delete" | "complete" | "assign" | "move" | "update_priority", taskIds: number[], ... }
 */

interface BulkOperationRequest {
  action: "delete" | "complete" | "assign" | "move" | "update_priority" | "update_labels";
  taskIds: number[];
  listId?: number;
  assigneeId?: number;
  priority?: "critical" | "high" | "medium" | "low" | "none";
  labelIds?: number[];
}

interface DbRunResult {
  changes: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BulkOperationRequest;
    const { action, taskIds } = body;

    if (!taskIds || taskIds.length === 0) {
      return NextResponse.json({ error: "No tasks provided" }, { status: 400 });
    }

    const db = getDb();
    let result;

    switch (action) {
      case "delete":
        result = await bulkDeleteTasks(db, taskIds);
        break;

      case "complete":
        result = await bulkCompleteTasks(db, taskIds, true);
        break;

      case "assign":
        result = await bulkAssignTasks(db, taskIds, body.assigneeId);
        break;

      case "move":
        result = await bulkMoveTasks(db, taskIds, body.listId);
        break;

      case "update_priority":
        result = await bulkUpdatePriority(db, taskIds, body.priority);
        break;

      case "update_labels":
        result = await bulkUpdateLabels(db, taskIds, body.labelIds || []);
        break;

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    logInfo(`Bulk operation completed: ${action}`, { count: taskIds.length, result });
    return NextResponse.json({ success: true, action, count: taskIds.length, ...result });

  } catch (error) {
    logError("Bulk operation failed", undefined, error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk operation failed" },
      { status: 500 }
    );
  }
}

async function bulkDeleteTasks(db: Database, taskIds: number[]): Promise<{ deleted: number }> {
  const placeholders = taskIds.map(() => "?").join(",");
  const result = db.prepare(`DELETE FROM tasks WHERE id IN (${placeholders})`).run(...taskIds) as DbRunResult;
  return { deleted: result.changes };
}

async function bulkCompleteTasks(db: Database, taskIds: number[], completed: boolean): Promise<{ updated: number }> {
  const placeholders = taskIds.map(() => "?").join(",");
  const completedAt = completed ? new Date().toISOString() : null;

  const result = db.prepare(
    `UPDATE tasks SET completed = ?, completed_at = ? WHERE id IN (${placeholders})`
  ).run(completed ? 1 : 0, completedAt, ...taskIds) as DbRunResult;

  return { updated: result.changes };
}

async function bulkAssignTasks(db: Database, taskIds: number[], assigneeId: number | undefined): Promise<{ updated: number }> {
  if (!assigneeId) {
    throw new Error("Assignee ID required for assign action");
  }

  const placeholders = taskIds.map(() => "?").join(",");
  const result = db.prepare(
    `UPDATE tasks SET assignee_id = ? WHERE id IN (${placeholders})`
  ).run(assigneeId, ...taskIds) as DbRunResult;

  return { updated: result.changes };
}

async function bulkMoveTasks(db: Database, taskIds: number[], listId: number | undefined): Promise<{ updated: number }> {
  if (!listId) {
    throw new Error("List ID required for move action");
  }

  const placeholders = taskIds.map(() => "?").join(",");
  const result = db.prepare(
    `UPDATE tasks SET list_id = ? WHERE id IN (${placeholders})`
  ).run(listId, ...taskIds) as DbRunResult;

  return { updated: result.changes };
}

async function bulkUpdatePriority(db: Database, taskIds: number[], priority: "critical" | "high" | "medium" | "low" | "none" | undefined): Promise<{ updated: number }> {
  if (!priority) {
    throw new Error("Priority required for update_priority action");
  }

  const placeholders = taskIds.map(() => "?").join(",");
  const result = db.prepare(
    `UPDATE tasks SET priority = ? WHERE id IN (${placeholders})`
  ).run(priority, ...taskIds) as DbRunResult;

  return { updated: result.changes };
}

async function bulkUpdateLabels(db: Database, taskIds: number[], labelIds: number[]): Promise<{ updated: number }> {
  const placeholders = taskIds.map(() => "?").join(",");

  // Remove existing labels
  db.prepare(`DELETE FROM task_labels WHERE task_id IN (${placeholders})`).run(...taskIds);

  // Add new labels if provided
  if (labelIds.length > 0) {
    const values = taskIds.flatMap(taskId => labelIds.map(labelId => [taskId, labelId]));
    const stmt = db.prepare(`INSERT OR REPLACE INTO task_labels (task_id, label_id) VALUES (?, ?)`);
    for (const [taskId, labelId] of values) {
      stmt.run(taskId, labelId);
    }
  }

  return { updated: taskIds.length };
}