import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import {
  applyMiddleware,
  jsonResponse,
  errorResponse,
} from '@/lib/api-middleware';
import { z } from 'zod';

const CreateHabitContextSchema = z.object({
  task_id: z.number(),
  user_id: z.number().optional(),
  context_type: z.enum([
    'time_of_day',
    'location',
    'mood',
    'energy_level',
    'external_trigger',
  ]),
  context_value: z.string(),
  success: z.boolean().optional(),
  frequency: z.number().min(1).optional(),
  success_rate: z.number().min(0).max(100).optional(),
});

// GET habit context for a task
export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse('User not authenticated', 401);
  }

  const db = getDb();

  const searchParams = request.nextUrl.searchParams;
  const taskId = searchParams.get('task_id');

  let query = `
    SELECT hc.*, t.name as task_name
    FROM habit_contexts hc
    LEFT JOIN tasks t ON hc.task_id = t.id
    WHERE hc.user_id = ?
  `;
  const params: (number | string)[] = [userId];

  if (taskId) {
    query += ' AND hc.task_id = ?';
    params.push(parseInt(taskId, 10));
  }

  query += ' ORDER BY hc.created_at DESC';

  const contexts = db.prepare(query).all(...params);

  return jsonResponse(contexts);
}

// POST create habit context
export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse('User not authenticated', 401);
  }

  try {
    const body = await request.json();
    const parsed = CreateHabitContextSchema.safeParse({
      ...body,
      user_id: userId,
    });

    if (!parsed.success) {
      return errorResponse(
        'Invalid input: ' + parsed.error.issues[0].message,
        400
      );
    }

    const {
      task_id,
      context_type,
      context_value,
      success = false,
    } = parsed.data;

    const db = getDb();

    // Check if task belongs to user
    const task = db
      .prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?')
      .get(task_id, userId);

    if (!task) {
      return errorResponse('Task not found or access denied', 404);
    }

    // Check if context already exists for this task and type
    const existingContext = db
      .prepare(
        'SELECT id, frequency, success_rate FROM habit_contexts WHERE task_id = ? AND user_id = ? AND context_type = ?'
      )
      .get(task_id, userId, context_type) as
      { id: number; frequency: number; success_rate: number } | undefined;

    let result;

    if (existingContext) {
      // Update existing context
      const newFrequency = existingContext.frequency + 1;
      const newSuccessRate = calculateNewSuccessRate(
        existingContext.success_rate,
        existingContext.frequency,
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
      .prepare('SELECT * FROM habit_contexts WHERE id = ?')
      .get(result.lastInsertRowid || existingContext?.id);

    return jsonResponse(newContext);
  } catch (error: unknown) {
    console.error('Failed to create habit context:', error);
    return errorResponse(
      `Failed to create habit context: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}

// DELETE habit context
export async function DELETE(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse('User not authenticated', 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const contextId = parseInt(searchParams.get('id') || '0', 10);

  if (!contextId) {
    return errorResponse('Context ID required', 400);
  }

  const db = getDb();

  // Check if context belongs to user
  const existing = db
    .prepare('SELECT id FROM habit_contexts WHERE id = ? AND user_id = ?')
    .get(contextId, userId);

  if (!existing) {
    return errorResponse('Context not found or access denied', 404);
  }

  db.prepare('DELETE FROM habit_contexts WHERE id = ?').run(contextId);

  return jsonResponse({ success: true });
}

function calculateNewSuccessRate(
  currentRate: number,
  currentFrequency: number,
  newSuccess: boolean,
  _newFrequency: number
): number {
  const totalSuccesses =
    (currentRate * currentFrequency) / 100 + (newSuccess ? 1 : 0);
  const totalRecords = currentFrequency + 1;
  return Math.round((totalSuccesses / totalRecords) * 100);
}
