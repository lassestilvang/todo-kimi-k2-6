import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";

interface TaskRecord {
  id: number;
}

interface RecurringException {
  id: number;
  task_id: number;
  exception_date: string;
  created_at: string;
}

// GET /api/recurring-exceptions?taskId=123 - Get exceptions for a task
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const searchParams = request.nextUrl.searchParams;
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return errorResponse("Task ID is required", 400);
  }

  try {
    const db = getDb();
    const userId = middlewareResult.auth?.userId;

    const exceptions = db.prepare(
      "SELECT * FROM recurring_exceptions WHERE task_id = ? ORDER BY exception_date ASC"
    ).all(parseInt(taskId, 10)) as RecurringException[];

    return jsonResponse(exceptions, 200, middlewareResult.headers);
  } catch (error) {
    console.error("Error fetching recurring exceptions:", error);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/recurring-exceptions - Add an exception
export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const body = await request.json();
    const { task_id, exception_date } = body;
    const userId = middlewareResult.auth?.userId;

    if (!task_id || !exception_date) {
      return errorResponse("Task ID and exception date are required", 400);
    }

    if (!userId) {
      return errorResponse("Authentication required", 401);
    }

    const db = getDb();

    // Verify task belongs to user (including shared tasks with edit permission)
    const task = db.prepare(
      "SELECT id FROM tasks WHERE id = ? AND (user_id = ? OR user_id IS NULL)"
    )
      .get(task_id, userId) as TaskRecord | undefined;

    if (!task) {
      return errorResponse("Task not found or access denied", 404);
    }

    // Add exception (ignore if already exists)
    db.prepare(
      "INSERT OR IGNORE INTO recurring_exceptions (task_id, exception_date) VALUES (?, ?)"
    ).run(task_id, exception_date);

    const exception = db.prepare(
      "SELECT * FROM recurring_exceptions WHERE task_id = ? AND exception_date = ?"
    ).get(task_id, exception_date) as RecurringException | undefined;

    return jsonResponse(exception, 201, middlewareResult.headers);
  } catch (error) {
    console.error("Error adding recurring exception:", error);
    return errorResponse("Internal server error", 500);
  }
}

// DELETE /api/recurring-exceptions/:id - Remove an exception
export async function DELETE(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const userId = middlewareResult.auth?.userId;

  if (!id) {
    return errorResponse("Exception ID is required", 400);
  }

  if (!userId) {
    return errorResponse("Authentication required", 401);
  }

  try {
    const db = getDb();

    // Verify the exception belongs to a task owned by the user
    const exception = db.prepare(
      `SELECT re.* FROM recurring_exceptions re
      INNER JOIN tasks t ON re.task_id = t.id
      WHERE re.id = ? AND t.user_id = ?`
    ).get(parseInt(id, 10), userId) as RecurringException | undefined;

    if (!exception) {
      return errorResponse("Exception not found or access denied", 404);
    }

    db.prepare("DELETE FROM recurring_exceptions WHERE id = ?").run(parseInt(id, 10));

    return jsonResponse({ success: true }, 200, middlewareResult.headers);
  } catch (error) {
    console.error("Error removing recurring exception:", error);
    return errorResponse("Internal server error", 500);
  }
}