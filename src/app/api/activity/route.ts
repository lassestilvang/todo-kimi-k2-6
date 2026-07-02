import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/config";

// GET /api/activity - Get recent activity logs
export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const workspaceId = searchParams.get("workspace_id");

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    let query: string;
    let params: any[];

    if (workspaceId) {
      // Get activities for tasks in the workspace
      query = `
        SELECT al.*, u.name as user_name, u.email as user_email
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        INNER JOIN tasks t ON al.entity_type = 'task' AND al.entity_id = t.id
        WHERE t.workspace_id = ?
        ORDER BY al.created_at DESC
        LIMIT 50
      `;
      params = [parseInt(workspaceId, 10)];
    } else {
      // Get all activities for the user's tasks
      query = `
        SELECT al.*, u.name as user_name, u.email as user_email
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        INNER JOIN tasks t ON al.entity_type = 'task' AND al.entity_id = t.id
        WHERE t.created_by = ? OR t.assignee_id = ?
        ORDER BY al.created_at DESC
        LIMIT 50
      `;
      params = [session.user.id, session.user.id];
    }

    const activities = db.prepare(query).all(...params);

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}