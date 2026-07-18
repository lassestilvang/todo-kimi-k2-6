import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";

interface UpdateMemberInput {
  role?: "owner" | "admin" | "member" | "viewer";
}

// PATCH update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const workspaceId = parseInt(params.id, 10);
  const memberId = parseInt(params.memberId, 10);

  if (isNaN(workspaceId) || isNaN(memberId)) {
    return errorResponse("Invalid ID", 400);
  }

  const userId = middleware.auth?.userId;
  const body = await request.json() as UpdateMemberInput;
  const { role } = body;

  if (!role) {
    return errorResponse("Role is required", 400);
  }

  const db = getDb();

  // Check if current user is owner (only owner can assign owner role)
  const currentUser = db
    .prepare("SELECT role FROM workspace_users WHERE workspace_id = ? AND user_id = ?")
    .get(workspaceId, userId) as { role: string } | undefined;

  if (!currentUser || (currentUser.role !== "owner" && currentUser.role !== "admin")) {
    return errorResponse("Only owners and admins can update roles", 403);
  }

  // If changing to owner, remove owner from other members
  if (role === "owner") {
    const existingOwner = db
      .prepare("SELECT user_id FROM workspace_users WHERE workspace_id = ? AND role = 'owner'")
      .get(workspaceId) as { user_id: number } | undefined;

    if (existingOwner && existingOwner.user_id !== userId) {
      db.prepare("UPDATE workspace_users SET role = 'admin' WHERE workspace_id = ? AND user_id = ?", workspaceId, existingOwner.user_id).run();
    }
  }

  // Update member role
  db.prepare("UPDATE workspace_users SET role = ? WHERE id = ? AND workspace_id = ?")
    .run(role, memberId, workspaceId);

  const updatedMember = db
    .prepare(`
      SELECT wu.*, u.name, u.email, u.avatar_url
      FROM workspace_users wu
      JOIN users u ON wu.user_id = u.id
      WHERE wu.id = ?
    `)
    .get(memberId);

  if (!updatedMember) {
    return errorResponse("Member not found", 404);
  }

  return jsonResponse(updatedMember);
}

// DELETE remove member from workspace
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const workspaceId = parseInt(params.id, 10);
  const memberId = parseInt(params.memberId, 10);

  if (isNaN(workspaceId) || isNaN(memberId)) {
    return errorResponse("Invalid ID", 400);
  }

  const userId = middleware.auth?.userId;
  const db = getDb();

  // Check if current user is owner (only owner can remove members)
  const currentUser = db
    .prepare("SELECT role FROM workspace_users WHERE workspace_id = ? AND user_id = ?")
    .get(workspaceId, userId) as { role: string } | undefined;

  if (!currentUser || currentUser.role !== "owner") {
    return errorResponse("Only owners can remove members", 403);
  }

  // Check if trying to remove yourself
  const member = db
    .prepare("SELECT user_id FROM workspace_users WHERE id = ?")
    .get(memberId) as { user_id: number } | undefined;

  if (member?.user_id === userId) {
    return errorResponse("Owner cannot remove themselves", 400);
  }

  // Delete member
  db.prepare("DELETE FROM workspace_users WHERE id = ? AND workspace_id = ?")
    .run(memberId, workspaceId);

  return jsonResponse({ success: true });
}