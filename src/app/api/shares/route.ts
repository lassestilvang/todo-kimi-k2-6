import { NextRequest, NextResponse } from "next/server";
import {
  getTaskShares,
  shareTask,
  removeShare,
  getSharedTasks,
  getOrCreateUser,
  createPublicShare,
  getShareByToken,
} from "@/lib/actions/sharing";

// GET /api/shares?taskId=123 - Get all shares for a task
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get("taskId");
    const userId = searchParams.get("userId");
    const token = searchParams.get("token");

    if (token) {
      // Public share lookup
      const share = await getShareByToken(token);
      if (!share) {
        return NextResponse.json({ error: "Invalid share token" }, { status: 404 });
      }
      return NextResponse.json({ share });
    }

    if (taskId) {
      const shares = await getTaskShares(Number(taskId));
      return NextResponse.json({ shares });
    }

    if (userId) {
      const shares = await getSharedTasks(Number(userId));
      return NextResponse.json({ shares });
    }

    return NextResponse.json({ error: "Task ID, user ID, or token required" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch shares";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/shares - Create a new share
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, userEmail, permission, isPublic } = body;

    if (!taskId || (!userEmail && !isPublic) || !permission) {
      return NextResponse.json(
        { error: "Task ID, and permission are required. For private shares, user email is also required." },
        { status: 400 }
      );
    }

    if (isPublic) {
      // Create public share
      const share = await createPublicShare(taskId, permission as "view" | "edit");
      return NextResponse.json({ share }, { status: 201 });
    }

    // Private share with user
    const user = await getOrCreateUser(userEmail);
    const share = await shareTask(taskId, user.id, permission as "view" | "edit");

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create share";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/shares - Remove a share
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shareId = searchParams.get("shareId");

    if (!shareId) {
      return NextResponse.json(
        { error: "Share ID is required" },
        { status: 400 }
      );
    }

    await removeShare(Number(shareId));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove share";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}