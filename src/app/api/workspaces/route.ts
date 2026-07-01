import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * Workspaces API routes.
 *
 * GET /api/workspaces - List all workspaces for the current user
 * POST /api/workspaces - Create a new workspace
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const workspaces = db.prepare(`
      SELECT w.*, ws.role
      FROM workspaces w
      JOIN workspace_users ws ON w.id = ws.workspace_id
      ORDER BY w.created_at DESC
    `).all();

    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
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

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}