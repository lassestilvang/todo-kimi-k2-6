import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { applyMiddleware, jsonResponse, errorResponse } from "@/lib/api-middleware";

interface CreateHabitContextInput {
  task_id: number;
  user_id: number;
  context_type: "time_of_day" | "location" | "mood" | "energy_level" | "external_trigger";
  context_value: string;
  success: boolean;
}

// GET habit context for a task
export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId || 1;
  const db = getDb();

  const contexts = db
    .prepare(
      `SELECT * FROM habit_contexts
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .all(userId);

  return jsonResponse(contexts);
}

// POST create habit context
export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId || 1;
  const body = await request.json() as CreateHabitContextInput;

  const { task_id, context_type, context_value, success } = body;

  if (!task_id || !context_type || !context_value) {
    return errorResponse("task_id, context_type, and context_value are required", 400);
  }

  const db = getDb();

  // Check if task belongs to user
  const task = db
    .prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?")
    .get(task_id, userId);

  if (!task) {
    return errorResponse("Task not found or access denied", 404);
  }

  // Check if context already exists for this task and type
  const existingContext = db
    .prepare(
      "SELECT id FROM habit_contexts WHERE task_id = ? AND user_id = ? AND context_type = ?"
    )
    .get(task_id, userId, context_type);

  let result;

  if (existingContext) {
    // Update existing context
    const newFrequency = body.frequency || 1;
    const newSuccessRate = calculateNewSuccessRate(
      body.success_rate || 0,
      body.frequency || 1,
      success,
      newFrequency
    );

    result = db
      .prepare(
        `UPDATE habit_contexts
         SET context_value = ?, frequency = ?, success_rate = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(context_value, newFrequency, newSuccessRate, existingContext.id);
  } else {
    // Create new context
    result = db
      .prepare(
        `INSERT INTO habit_contexts (task_id, user_id, context_type, context_value, frequency, success_rate)
         VALUES (?, ?, ?, ?, 1, ?)`
      )
      .run(task_id, userId, context_type, context_value, success ? 100 : 0);
  }

  const newContext = db
    .prepare("SELECT * FROM habit_contexts WHERE id = ?")
    .get(result.lastInsertRowid || existingContext?.id);

  return jsonResponse(newContext);
}

function calculateNewSuccessRate(
  currentRate: number,
  currentFrequency: number,
  newSuccess: boolean,
  newFrequency: number
): number {
  const totalSuccesses = (currentRate * currentFrequency) / 100 + (newSuccess ? 1 : 0);
  const totalRecords = currentFrequency + 1;
  return Math.round((totalSuccesses / totalRecords) * 100);
}