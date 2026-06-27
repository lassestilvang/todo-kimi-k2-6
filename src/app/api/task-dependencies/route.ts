import { NextRequest, NextResponse } from "next/server";
import {
  addTaskDependency,
  removeTaskDependency,
} from "@/lib/actions/tasks";
import type { Task } from "@/types";

// GET /api/task-dependencies - Get blocked tasks
export async function GET(request: NextRequest) {
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
    return NextResponse.json({ blockedBy: Number(blockedBy), tasks });
  }

  return NextResponse.json({ error: "blockedBy required" }, { status: 400 });
}

// POST /api/task-dependencies - Add a dependency
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dependency = await addTaskDependency(body.taskId, body.dependsOnTaskId);
    return NextResponse.json({ dependency }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add dependency";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/task-dependencies - Remove a dependency
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const taskId = searchParams.get("taskId");
  const dependsOnTaskId = searchParams.get("dependsOnTaskId");

  if (!taskId || !dependsOnTaskId) {
    return NextResponse.json(
      { error: "taskId and dependsOnTaskId are required" },
      { status: 400 }
    );
  }

  await removeTaskDependency(Number(taskId), Number(dependsOnTaskId));
  return NextResponse.json({ success: true });
}