import { NextRequest } from "next/server";
import {
  addTaskDependency,
  removeTaskDependency,
} from "@/lib/actions";
import type { Task } from "@/types";
import { applyMiddleware, jsonResponse, errorResponse } from "@/lib/api-middleware";

// GET /api/task-dependencies - Get blocked tasks
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const searchParams = request.nextUrl.searchParams;
  const blockedBy = searchParams.get("blockedBy");

  if (blockedBy) {
    // Get tasks that are blocked by the given task
    const db = (await import("@/lib/db")).getDb();
    const tasks = db
      .prepare(
        "SELECT * FROM tasks WHERE id IN (SELECT task_id FROM task_dependencies WHERE depends_on_task_id = ?)"
      )
      .all(Number(blockedBy)) as Task[];
    return jsonResponse({ blockedBy: Number(blockedBy), tasks }, 200, middlewareResult.headers);
  }

  return errorResponse("blockedBy required", 400);
}

// POST /api/task-dependencies - Add a dependency
export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const body = await request.json();
    const dependency = await addTaskDependency(body.taskId, body.dependsOnTaskId);
    return jsonResponse({ dependency }, 201, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add dependency";
    return errorResponse(message, 400);
  }
}

// DELETE /api/task-dependencies - Remove a dependency
export async function DELETE(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const searchParams = request.nextUrl.searchParams;
  const taskId = searchParams.get("taskId");
  const dependsOnTaskId = searchParams.get("dependsOnTaskId");

  if (!taskId || !dependsOnTaskId) {
    return errorResponse("taskId and dependsOnTaskId are required", 400);
  }

  await removeTaskDependency(Number(taskId), Number(dependsOnTaskId));
  return jsonResponse({ success: true }, 200, middlewareResult.headers);
}