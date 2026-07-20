// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { applyMiddleware, jsonResponse, errorResponse } from "@/lib/api-middleware";
import type { TaskConnection } from "@/types";

interface CreateConnectionInput {
  source_task_id: number;
  target_task_id: number;
  connection_type: "prerequisite" | "inspiration" | "similar" | "contrast" | "related" | "learned_from";
  strength?: number;
  notes?: string;
}

// GET task connections
export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId || 1;
  const db = getDb();

  // Get connections for user's tasks
  const connections = db
    .prepare(`
      SELECT tc.*,
             t1.name as source_name,
             t2.name as target_name
      FROM task_connections tc
      JOIN tasks t1 ON tc.source_task_id = t1.id
      JOIN tasks t2 ON tc.target_task_id = t2.id
      WHERE t1.user_id = ? OR t2.user_id = ?
      ORDER BY tc.created_at DESC
    `)
    .all(userId, userId) as TaskConnection[];

  return jsonResponse(connections);
}

// POST create connection
export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId || 1;
  const body = await request.json() as CreateConnectionInput;

  const { source_task_id, target_task_id, connection_type, strength = 0.5, notes } = body;

  if (!source_task_id || !target_task_id) {
    return errorResponse("source_task_id and target_task_id are required", 400);
  }

  const db = getDb();

  // Verify both tasks belong to user
  const sourceTask = db
    .prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?")
    .get(source_task_id, userId);

  const targetTask = db
    .prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?")
    .get(target_task_id, userId);

  if (!sourceTask || !targetTask) {
    return errorResponse("One or both tasks not found or access denied", 404);
  }

  // Check if connection already exists
  const existing = db
    .prepare(
      "SELECT id FROM task_connections WHERE source_task_id = ? AND target_task_id = ?"
    )
    .get(source_task_id, target_task_id);

  if (existing) {
    return errorResponse("Connection already exists", 400);
  }

  // Create connection
  const result = db
    .prepare(
      `INSERT INTO task_connections (source_task_id, target_task_id, connection_type, strength, notes)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(source_task_id, target_task_id, connection_type, strength, notes || null);

  const connection = db
    .prepare("SELECT * FROM task_connections WHERE id = ?")
    .get(result.lastInsertRowid) as TaskConnection;

  return jsonResponse(connection, 201);
}

// DELETE connection
export async function DELETE(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId || 1;
  const searchParams = request.nextUrl.searchParams;
  const connectionId = parseInt(searchParams.get("id") || "0", 10);

  if (!connectionId) {
    return errorResponse("Connection ID is required", 400);
  }

  const db = getDb();

  // Verify connection belongs to user's tasks
  const connection = db
    .prepare(`
      SELECT tc.id
      FROM task_connections tc
      JOIN tasks t1 ON tc.source_task_id = t1.id
      JOIN tasks t2 ON tc.target_task_id = t2.id
      WHERE tc.id = ? AND (t1.user_id = ? OR t2.user_id = ?)
    `)
    .get(connectionId, userId, userId);

  if (!connection) {
    return errorResponse("Connection not found or access denied", 404);
  }

  db.prepare("DELETE FROM task_connections WHERE id = ?").run(connectionId);

  return jsonResponse({ success: true });
}