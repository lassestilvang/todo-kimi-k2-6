import { NextRequest, NextResponse } from "next/server";
import { getTaskComments, addTaskComment } from "@/lib/actions";
import { handleApiError } from "@/lib/middleware/error-handler";
import { applyMiddleware, jsonResponse, errorResponse } from "@/lib/api-middleware";

// GET /api/task-comments?taskId=1 - Get all comments for a task
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const searchParams = request.nextUrl.searchParams;
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const comments = await getTaskComments(Number(taskId));
  return jsonResponse({ comments }, 200, middlewareResult.headers);
}

// POST /api/task-comments - Add a new comment to a task
export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const body = await request.json();
    const comment = await addTaskComment(body.taskId, body);
    return jsonResponse({ comment }, 201, middlewareResult.headers);
  } catch (error) {
    const { message, status } = handleApiError(error);
    return errorResponse(message, status);
  }
}