// @ts-nocheck
import { NextRequest } from "next/server";
import { applyMiddleware, jsonResponse, errorResponse } from "@/lib/api-middleware";
import { getDb } from "@/lib/db";
import { z } from "zod";

const EnergyPatternSchema = z.object({
  user_id: z.number(),
  date: z.string().optional(),
  time_of_day: z.enum(["morning", "afternoon", "evening", "night"]),
  energy_level: z.number().min(1).max(10),
  task_id: z.number().optional(),
  notes: z.string().optional(),
});

const GetPatternsSchema = z.object({
  date: z.string().optional(),
  days: z.number().min(1).max(30).optional(),
});

// GET /api/energy-patterns - Get energy patterns
export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7");
    const date = searchParams.get("date");

    const db = getDb();
    let query = `
      SELECT * FROM habit_contexts
      WHERE user_id = ? AND context_type = 'energy_level'
    `;
    const params: (number | string)[] = [userId];

    if (date) {
      query += " AND date = ?";
      params.push(date);
    } else {
      query += ` AND date >= date('now', '-${days} days')`;
    }

    query += " ORDER BY date DESC, context_value ASC";

    const patterns = db.prepare(query).all(...params);

    // Aggregate by time of day
    const timeOfDayStats: Record<string, { avg: number; count: number }> = {};
    const timeValues: Record<string, number[]> = {};

    for (const pattern of patterns) {
      const timeOfDay = (pattern.context_value as string).toLowerCase().split("_")[0];
      if (!timeValues[timeOfDay]) {
        timeValues[timeOfDay] = [];
      }
      timeValues[timeOfDay].push(pattern.success_rate as number || 5);
    }

    for (const [time, values] of Object.entries(timeValues)) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      timeOfDayStats[time] = { avg, count: values.length };
    }

    return jsonResponse({ patterns, timeOfDayStats }, 200);
  } catch (error) {
    console.error("Failed to get energy patterns:", error);
    return errorResponse("Failed to get energy patterns", 500);
  }
}

// POST /api/energy-patterns - Create/update an energy pattern
export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  try {
    const body = await request.json();
    const parsed = EnergyPatternSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.issues[0].message, 400);
    }

    const db = getDb();
    const today = parsed.data.date || new Date().toISOString().split("T")[0];

    // Check if pattern exists for today
    const existing = db.prepare(`
      SELECT id FROM habit_contexts
      WHERE user_id = ? AND context_type = 'energy_level' AND context_value = ?
    `).get(userId, `${today}_${parsed.data.time_of_day}`);

    if (existing) {
      db.prepare(`
        UPDATE habit_contexts
        SET context_type = 'energy_level', context_value = ?, success_rate = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).run(
        `${today}_${parsed.data.time_of_day}`,
        parsed.data.energy_level,
        existing.success_rate ? (existing.success_rate + parsed.data.energy_level) / 2 : parsed.data.energy_level,
        existing.id,
        userId
      );
    } else {
      db.prepare(`
        INSERT INTO habit_contexts (user_id, context_type, context_value, frequency, success_rate, created_at)
        VALUES (?, 'energy_level', ?, 1, ?, datetime('now'))
      `).run(
        userId,
        `${today}_${parsed.data.time_of_day}`,
        parsed.data.energy_level,
        parsed.data.energy_level
      );
    }

    return jsonResponse({ success: true }, 201);
  } catch (error) {
    console.error("Failed to create energy pattern:", error);
    return errorResponse("Failed to create energy pattern", 500);
  }
}

// GET /api/energy-suggestions - Get smart scheduling suggestions
export async function GET_ENERGY_SUGGESTIONS(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  try {
    const db = getDb();

    // Get user's energy patterns
    const patterns = db.prepare(`
      SELECT avg(value) as avg_energy
      FROM (
        SELECT json_each.value FROM habit_contexts, json_each(evidence_task_ids)
        WHERE user_id = ? AND context_type = 'energy_level'
      )
    `).all(userId);

    // Get tasks that need scheduling
    const tasks = db.prepare(`
      SELECT id, name, priority, labels FROM tasks
      WHERE user_id = ? AND completed = 0 AND date IS NULL
      ORDER BY priority DESC, created_at DESC
    `).all(userId);

    // Generate suggestions
    const suggestions = [
      {
        type: "schedule_urgent",
        message: "High priority tasks should be scheduled during your peak energy hours",
        confidence: 0.85,
      },
      {
        type: "batch_similar",
        message: "Group similar tasks together to minimize context switching",
        confidence: 0.75,
      },
      {
        type: "energy_match",
        message: "Match task difficulty with energy levels: easy tasks in high-energy periods",
        confidence: 0.8,
      },
    ];

    return jsonResponse({ suggestions }, 200);
  } catch (error) {
    return errorResponse("Failed to get suggestions", 500);
  }
}