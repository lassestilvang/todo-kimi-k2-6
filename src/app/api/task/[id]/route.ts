import { NextRequest } from "next/server";
import {
  getTaskById,
  updateTask,
  deleteTask,
  addTaskComment,
} from "@/lib/actions";
import { updateTaskSchema } from "@/lib/validation";
import { applyMiddleware, jsonResponse, errorResponse } from "@/lib/api-middleware";
import type { UpdateTaskInput, CreateCommentInput } from "@/types";

// Helper to validate task ID
function validateTaskId(idParam: string): number | null {
  const id = parseInt(idParam, 10);
  if (isNaN(id) || id <= 0) return null;
  return id;
}

// GET /api/task/[id] - Get a single task
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const params = await context.params;
  const id = validateTaskId(params.id);
  if (!id) {
    return errorResponse("Invalid task ID", 400);
  }

  try {
    const task = await getTaskById(id);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    return jsonResponse({ task }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch task";
    return errorResponse(message, 500);
  }
}

// PUT /api/task/[id] - Update a task
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const params = await context.params;
  const id = validateTaskId(params.id);
  if (!id) {
    return errorResponse("Invalid task ID", 400);
  }

  try {
    const body = await request.json();

    // Validate input
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.issues);
    }

    const task = await updateTask(id, parsed.data as UpdateTaskInput);
    return jsonResponse({ task }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update task";
    return errorResponse(message, 400);
  }
}

// DELETE /api/task/[id] - Delete a task
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const params = await context.params;
  const id = validateTaskId(params.id);
  if (!id) {
    return errorResponse("Invalid task ID", 400);
  }

  try {
    await deleteTask(id);
    return jsonResponse({ success: true }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete task";
    return errorResponse(message, 500);
  }
}

// POST /api/task/[id]/comments - Add a comment to a task
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const params = await context.params;
  const id = validateTaskId(params.id);
  if (!id) {
    return errorResponse("Invalid task ID", 400);
  }

  try {
    const body = await request.json();

    // Validate comment input
    if (!body?.content || typeof body.content !== "string") {
      return errorResponse("Comment content is required", 400);
    }

    const comment = await addTaskComment(id, { content: body.content } as CreateCommentInput);
    return jsonResponse({ comment }, 201, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add comment";
    return errorResponse(message, 400);
  }
}