// @ts-nocheck
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { applyMiddleware, jsonResponse, errorResponse } from "@/lib/api-middleware";

interface WorkspaceMember {
  id: number;
  workspace_id: number;
  user_id: number;
  role: "owner" | "admin" | "member" | "viewer";
  joined_at: string;
}

interface AddMemberInput {
  email: string;
  role: "admin" | "member" | "viewer";
}

interface User {
  id: number;
  name: string | null;
  email: string;
  avatar_url: string | null;
}

// GET workspace members
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const params = await context.params;
  const workspaceId = parseInt(params.id, 10);
  if (isNaN(workspaceId)) {
    return errorResponse("Invalid workspace ID", 400);
  }

  const db = getDb();
  const userId = middleware.auth?.userId;

  // Check if user has access to this workspace
  const workspaceMember = db
    .prepare("SELECT role FROM workspace_users WHERE workspace_id = ? AND user_id = ?")
    .get(workspaceId, userId) as { role: string } | undefined;

  if (!workspaceMember) {
    return errorResponse("Access denied", 403);
  }

  // Get all members with user info (using workspace_users table)
  const members = db
    .prepare(`
      SELECT wu.*, u.name, u.email, u.avatar_url
      FROM workspace_users wu
      JOIN users u ON wu.user_id = u.id
      WHERE wu.workspace_id = ?
      ORDER BY wu.role DESC, u.name ASC
    `)
    .all(workspaceId) as (WorkspaceMember & User)[];

  return jsonResponse(members);
}

// POST add member to workspace
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const params = await context.params;
  const workspaceId = parseInt(params.id, 10);
  if (isNaN(workspaceId)) {
    return errorResponse("Invalid workspace ID", 400);
  }

  const userId = middleware.auth?.userId;
  const body = await request.json() as AddMemberInput;
  const { email, role } = body;

  if (!email) {
    return errorResponse("Email is required", 400);
  }

  const db = getDb();

  // Check if current user is owner or admin
  const currentUser = db
    .prepare("SELECT role FROM workspace_users WHERE workspace_id = ? AND user_id = ?")
    .get(workspaceId, userId) as { role: string } | undefined;

  if (!currentUser || (currentUser.role !== "owner" && currentUser.role !== "admin")) {
    return errorResponse("Only owners and admins can add members", 403);
  }

  // Find user by email
  const user = db
    .prepare("SELECT id, name, email FROM users WHERE email = ?")
    .get(email) as User | undefined;

  if (!user) {
    return errorResponse("User not found. They need to have an account first.", 404);
  }

  // Check if user is already a member
  const existingMember = db
    .prepare("SELECT id FROM workspace_users WHERE workspace_id = ? AND user_id = ?")
    .get(workspaceId, user.id);

  if (existingMember) {
    return errorResponse("User is already a member", 400);
  }

  // Add user to workspace
  const result = db
    .prepare(
      "INSERT INTO workspace_users (workspace_id, user_id, role) VALUES (?, ?, ?)"
    )
    .run(workspaceId, user.id, role);

  const newMember = db
    .prepare(`
      SELECT wu.*, u.name, u.email, u.avatar_url
      FROM workspace_users wu
      JOIN users u ON wu.user_id = u.id
      WHERE wu.id = ?
    `)
    .get(result.lastInsertRowid) as WorkspaceMember & User;

  return jsonResponse(newMember, 201);
}