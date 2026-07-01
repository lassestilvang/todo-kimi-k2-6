import { NextRequest, NextResponse } from "next/server";
import { getTaskComments, addTaskComment } from "@/lib/actions/tasks";
import { handleApiError } from "@/lib/middleware/error-handler";

// GET /api/task-comments?taskId=1 - Get all comments for a task
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const comments = await getTaskComments(Number(taskId));
  return NextResponse.json({ comments });
}

// POST /api/task-comments - Add a new comment to a task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const comment = await addTaskComment(body.taskId, body);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}