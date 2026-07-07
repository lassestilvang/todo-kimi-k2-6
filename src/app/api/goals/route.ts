import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";
import type { Goal, CreateGoalInput } from "@/types";

// Get all goals for the current user
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const db = getDb();
  const userId = middlewareResult.auth?.userId;

  // User isolation: only fetch goals for authenticated user
  if (userId) {
    const goals = db.prepare("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC").all(userId) as Goal[];
    return jsonResponse({ goals }, 200, middlewareResult.headers);
  }

  return jsonResponse({ goals: [] }, 200, middlewareResult.headers);
}

// Create a new goal
export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const body = await request.json() as CreateGoalInput;
    const { name, description, target_count, target_unit, period } = body;

    if (!name || !target_count || !target_unit || !period) {
      return errorResponse("Missing required fields", 400);
    }

    const db = getDb();
    const userId = middlewareResult.auth?.userId;

    if (!userId) {
      return errorResponse("Authentication required", 401);
    }

    const result = db
      .prepare(
        `INSERT INTO goals (user_id, name, description, target_count, target_unit, period)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(userId, name, description || null, target_count, target_unit, period);

    const goal = db
      .prepare("SELECT * FROM goals WHERE id = ?")
      .get(result.lastInsertRowid as number) as Goal;

    return jsonResponse({ goal }, 201, middlewareResult.headers);
  } catch (error) {
    console.error("Error creating goal:", error);
    return errorResponse("Failed to create goal", 500);
  }
}