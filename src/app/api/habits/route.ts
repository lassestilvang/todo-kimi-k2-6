import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * Habits API routes.
 *
 * GET /api/habits - List all habits (tasks with recurring patterns)
 * POST /api/habits - Create a new habit from a recurring task
 */
export async function GET() {
  try {
    const db = getDb();
    const habits = db.prepare(`
      SELECT t.*, hs.streak_count, hs.last_completed
      FROM tasks t
      LEFT JOIN habit_streaks hs ON t.id = hs.task_id
      WHERE t.recurring != 'none' AND t.recurring != 'none'
      ORDER BY t.created_at DESC
    `).all();

    return NextResponse.json(habits);
  } catch (error) {
    console.error("Error fetching habits:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task_id, streak_count, last_completed } = body;

    if (!task_id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const db = getDb();
    db
      .prepare(`
        INSERT INTO habit_streaks (task_id, streak_count, last_completed)
        VALUES (?, ?, ?)
      `)
      .run(task_id, streak_count || 0, last_completed || null);

    const habit = db
      .prepare(`
        SELECT t.*, hs.streak_count, hs.last_completed
        FROM tasks t
        LEFT JOIN habit_streaks hs ON t.id = hs.task_id
        WHERE t.id = ?
      `)
      .get(task_id);

    return NextResponse.json(habit, { status: 201 });
  } catch (error) {
    console.error("Error creating habit:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}