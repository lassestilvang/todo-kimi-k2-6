import { NextRequest, NextResponse } from "next/server";
import {
  createSyncConnection,
  getExternalTasks,
  convertExternalTaskToTask,
} from "@/lib/actions/enhanced-productivity";
import { applyMiddleware } from "@/lib/api-middleware";

export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) {
    return middleware.error;
  }

  const { searchParams } = new URL(request.url);

  try {
    const status = searchParams.get("status") || "pending";
    const userId = middleware.auth?.userId ?? 1;
    // Note: getExternalTasks doesn't take userId as parameter, filtering is done internally
    const tasks = await getExternalTasks(status);
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get external tasks" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) {
    return middleware.error;
  }

  try {
    const body = await request.json();

    if (body.action === "connection") {
      const result = await createSyncConnection(body);
      return NextResponse.json({ success: true, id: result.id });
    }

    if (body.action === "convert") {
      const result = await convertExternalTaskToTask(body.taskId);
      return NextResponse.json({ success: true, taskId: result.taskId, taskName: result.taskName });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 400 }
    );
  }
}