"use server";

import { getDb } from "@/lib/db";
import type { Workspace, WorkspaceUser, CreateWorkspaceInput, WorkspaceRole } from "@/types";

export async function getWorkspaces(): Promise<Workspace[]> {
  const db = getDb();
  return db.prepare("SELECT * FROM workspaces ORDER BY created_at DESC").all() as Workspace[];
}

export async function getWorkspaceById(id: number): Promise<Workspace | undefined> {
  const db = getDb();
  return db.prepare("SELECT * FROM workspaces WHERE id = ?").get(id) as Workspace | undefined;
}

export async function createWorkspace(input: CreateWorkspaceInput & { user_id: number }): Promise<Workspace> {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO workspaces (name, description, created_by)
       VALUES (?, ?, ?)`
    )
    .run(input.name, input.description || null, input.user_id);

  return {
    id: Number(result.lastInsertRowid),
    name: input.name,
    description: input.description || null,
    created_by: input.user_id,
    created_at: new Date().toISOString(),
  };
}

export async function updateWorkspace(id: number, updates: Partial<CreateWorkspaceInput>): Promise<Workspace> {
  const db = getDb();
  const { name, description } = updates;

  db.prepare("UPDATE workspaces SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?")
    .run(name, description, id);

  const workspace = await getWorkspaceById(id);
  if (!workspace) throw new Error("Workspace not found");
  return workspace;
}

export async function deleteWorkspace(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM workspaces WHERE id = ?").run(id);
}

export async function addWorkspaceMember(workspaceId: number, userId: number, role: WorkspaceRole = "member"): Promise<WorkspaceUser> {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT OR REPLACE INTO workspace_users (workspace_id, user_id, role) VALUES (?, ?, ?)"
    )
    .run(workspaceId, userId, role);

  return {
    id: Number(result.lastInsertRowid),
    workspace_id: workspaceId,
    user_id: userId,
    role,
    joined_at: new Date().toISOString(),
  };
}

export async function removeWorkspaceMember(workspaceId: number, userId: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM workspace_users WHERE workspace_id = ? AND user_id = ?").run(workspaceId, userId);
}

export async function getWorkspaceMembers(workspaceId: number): Promise<Array<WorkspaceUser & { email: string; name: string | null }>> {
  const db = getDb();
  return db
    .prepare(
      `SELECT wu.*, u.email, u.name
       FROM workspace_users wu
       JOIN users u ON wu.user_id = u.id
       WHERE wu.workspace_id = ?`
    )
    .all(workspaceId) as Array<WorkspaceUser & { email: string; name: string | null }>;
}

export async function getUserWorkspaces(userId: number): Promise<Workspace[]> {
  const db = getDb();
  return db
    .prepare(
      `SELECT w.* FROM workspaces w
       JOIN workspace_users wu ON w.id = wu.workspace_id
       WHERE wu.user_id = ?`
    )
    .all(userId) as Workspace[];
}

export async function canUserAccessWorkspace(userId: number, workspaceId: number): Promise<boolean> {
  const db = getDb();
  const result = db
    .prepare("SELECT 1 FROM workspace_users WHERE user_id = ? AND workspace_id = ?")
    .get(userId, workspaceId);
  return !!result;
}