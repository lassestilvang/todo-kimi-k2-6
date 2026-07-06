import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";

// GET /api/activity - Get recent activity logs
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const searchParams = new URL(request.url).searchParams;
  const workspaceId = searchParams.get("workspace_id");

  try {
    const db = getDb();

    let query: string;
    let params: (string | number)[];

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
      // Note: For now, we get general activity - user filtering would require auth context
      query = `
        SELECT al.*, u.name as user_name, u.email as user_email
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 50
      `;
      params = [];
    }

    const activities = db.prepare(query).all(...params);

    return jsonResponse(activities, 200, middlewareResult.headers);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return errorResponse("Internal server error", 500);
  }
}