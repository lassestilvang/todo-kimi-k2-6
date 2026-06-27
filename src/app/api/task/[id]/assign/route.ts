"use server";

import { getDb } from "@/lib/db";
import { assignTask, unassignTask, getTaskAssignments } from "@/lib/actions/tasks";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const body = await request.json();
    const { user_id, permission } = body;
    const taskId = parseInt(resolvedParams.id);

    if (!user_id) {
      return Response.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    await assignTask(taskId, user_id, permission || "view");
    const assignments = await getTaskAssignments(taskId);

    return Response.json({ success: true, assignments });
  } catch (error) {
    console.error("Assignment error:", error);
    return Response.json(
      { error: "Failed to assign task" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const taskId = parseInt(resolvedParams.id);

    if (!userId) {
      return Response.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    await unassignTask(taskId, parseInt(userId));
    const assignments = await getTaskAssignments(taskId);

    return Response.json({ success: true, assignments });
  } catch (error) {
    console.error("Unassignment error:", error);
    return Response.json(
      { error: "Failed to unassign task" },
      { status: 500 }
    );
  }
}