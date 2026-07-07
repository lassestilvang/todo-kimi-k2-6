import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { logError } from "@/lib/logger";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";

interface VoteBody {
  task_id: number;
  value: -1 | 1;
}

/**
 * GET /api/task-votes - Get task votes
 * Query params: task_id (optional), user_id (optional)
 */
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request);
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const taskIdParam = searchParams.get("task_id");
    const userIdParam = searchParams.get("user_id");

    const db = getDb();

    if (taskIdParam && userIdParam) {
      // Get vote for specific user and task
      const vote = await db.prepare(
        "SELECT * FROM task_votes WHERE task_id = ? AND user_id = ?"
      ).get(parseInt(taskIdParam), parseInt(userIdParam));

      return jsonResponse({ vote: vote || null }, 200, middlewareResult.headers);
    }

    if (taskIdParam) {
      // Get all votes for a task with user info
      const votes = await db.prepare(
        `SELECT tv.*, u.name as user_name, u.avatar_url as user_avatar
         FROM task_votes tv
         JOIN users u ON tv.user_id = u.id
         WHERE tv.task_id = ?`
      ).all(parseInt(taskIdParam));

      const total = votes.reduce((sum: number, v: { value: number }) => sum + v.value, 0);
      const count = votes.length;

      return jsonResponse({
        votes,
        total,
        count,
        score: count > 0 ? total / count : 0,
      }, 200, middlewareResult.headers);
    }

    // Get all votes (with optional user filter)
    let query = `
      SELECT tv.*, t.name as task_name, u.name as user_name
      FROM task_votes tv
      JOIN tasks t ON tv.task_id = t.id
      JOIN users u ON tv.user_id = u.id
    `;
    const params: number[] = [];

    if (userIdParam) {
      query += " WHERE tv.user_id = ?";
      params.push(parseInt(userIdParam));
    }

    query += " ORDER BY tv.created_at DESC";

    const votes = await db.prepare(query).all(...params);
    return jsonResponse({ votes }, 200, middlewareResult.headers);
  } catch (error) {
    logError("Failed to fetch votes", undefined, error instanceof Error ? error : new Error(String(error)));
    return errorResponse("Failed to fetch votes", 500);
  }
}

/**
 * POST /api/task-votes - Create or update a vote
 */
export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request);
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const body = await request.json();
    const { task_id, value } = body as VoteBody;

    if (!task_id || !value || (value !== -1 && value !== 1)) {
      return errorResponse("Invalid vote data. value must be -1 or 1", 400);
    }

    const db = getDb();

    // Check if task exists
    const task = await db.prepare("SELECT id FROM tasks WHERE id = ?").get(task_id);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    // Get user from auth
    const userId = middlewareResult.auth?.userId || 1;

    // Upsert vote
    const existingVote = await db.prepare(
      "SELECT id FROM task_votes WHERE task_id = ? AND user_id = ?"
    ).get(task_id, userId);

    if (existingVote) {
      // Update existing vote
      db.prepare(
        "UPDATE task_votes SET value = ? WHERE task_id = ? AND user_id = ?"
      ).run(value, task_id, userId);
    } else {
      // Create new vote
      db.prepare(
        "INSERT INTO task_votes (task_id, user_id, value) VALUES (?, ?, ?)"
      ).run(task_id, userId, value);
    }

    // Get updated vote count
    const voteStats = await db.prepare(
      `SELECT SUM(value) as total, COUNT(*) as count
       FROM task_votes WHERE task_id = ?`
    ).get(task_id) as { total: number; count: number };

    return jsonResponse({
      success: true,
      vote: { task_id, user_id: userId, value },
      stats: {
        total: voteStats.total,
        count: voteStats.count,
        score: voteStats.count > 0 ? voteStats.total / voteStats.count : 0,
      },
    }, 200, middlewareResult.headers);
  } catch (error) {
    logError("Failed to create vote", undefined, error instanceof Error ? error : new Error(String(error)));
    return errorResponse("Failed to create vote", 500);
  }
}

/**
 * DELETE /api/task-votes - Remove a vote
 */
export async function DELETE(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request);
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const taskIdParam = searchParams.get("task_id");

    if (!taskIdParam) {
      return errorResponse("task_id is required", 400);
    }

    const db = getDb();
    const userId = middlewareResult.auth?.userId || 1;
    await db.prepare(
      "DELETE FROM task_votes WHERE task_id = ? AND user_id = ?"
    ).run(parseInt(taskIdParam), userId);

    return jsonResponse({ success: true }, 200, middlewareResult.headers);
  } catch (error) {
    logError("Failed to delete vote", undefined, error instanceof Error ? error : new Error(String(error)));
    return errorResponse("Failed to delete vote", 500);
  }
}