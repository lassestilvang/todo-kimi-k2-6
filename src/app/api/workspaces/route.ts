import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

import { applyMiddleware, jsonResponse, errorResponse } from "@/lib/api-middleware";

/**
 * Workspaces API routes.
 *
 * GET /api/workspaces - List all workspaces for the current user
 * POST /api/workspaces - Create a new workspace
 */
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const db = getDb();
    const workspaces = db.prepare(`
      SELECT w.*, ws.role
      FROM workspaces w
      JOIN workspace_users ws ON w.id = ws.workspace_id
      ORDER BY w.created_at DESC
    `).all();

    return jsonResponse(workspaces, 200, middlewareResult.headers);
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return errorResponse("Name is required", 400);
    }

    const db = getDb();
    const result = db
      .prepare(`INSERT INTO workspaces (name, description, created_by) VALUES (?, ?, ?)`)
      .run(name, description || null, 1);

    const workspace = db
      .prepare("SELECT * FROM workspaces WHERE id = ?")
      .get(result.lastInsertRowid);

    // Add creator as owner
    db.prepare("INSERT INTO workspace_users (workspace_id, user_id, role) VALUES (?, 1, 'owner')")
      .run(result.lastInsertRowid);

    return jsonResponse(workspace, 201, middlewareResult.headers);
  } catch (error) {
    console.error("Error creating workspace:", error);
    return errorResponse("Internal server error", 500);
  }
}