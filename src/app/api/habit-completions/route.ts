import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/config";

// GET /api/habit-completions - Get all habit completions for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const completions = db.prepare(`
      SELECT hc.*
      FROM habit_completions hc
      INNER JOIN tasks t ON hc.task_id = t.id
      WHERE t.created_by = ? OR t.assignee_id = ?
    `).all(session.user.id, session.user.id) as any[];

    return NextResponse.json(completions);
  } catch (error) {
    console.error("Error fetching habit completions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/habit-completions - Toggle a habit completion for a specific date
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { task_id, date } = body;

    if (!task_id || !date) {
      return NextResponse.json({ error: "Task ID and date are required" }, { status: 400 });
    }

    const db = getDb();

    // Check if completion already exists
    const existing = db.prepare(
      "SELECT id FROM habit_completions WHERE task_id = ? AND date = ?"
    ).get(task_id, date) as any;

    if (existing) {
      // Remove completion (toggle off)
      db.prepare("DELETE FROM habit_completions WHERE id = ?").run(existing.id);
    } else {
      // Add completion
      db.prepare(
        "INSERT INTO habit_completions (task_id, date) VALUES (?, ?)"
      ).run(task_id, date);
    }

    // Calculate actual streak (consecutive days)
    const completions = db.prepare(
      "SELECT date FROM habit_completions WHERE task_id = ? ORDER BY date DESC"
    ).all(task_id) as any[];

    let streak = 0;
    const completionDates = new Set(completions.map((c: any) => c.date));
    const today = new Date();

    for (let i = 0; i < 90; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      if (completionDates.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }

    // Update or create streak record
    const existingStreak = db.prepare(
      "SELECT id FROM habit_streaks WHERE task_id = ?"
    ).get(task_id) as any;

    if (existingStreak) {
      db.prepare(
        "UPDATE habit_streaks SET streak_count = ?, last_completed = ? WHERE task_id = ?"
      ).run(streak, date, task_id);
    } else {
      db.prepare(
        "INSERT INTO habit_streaks (task_id, streak_count, last_completed) VALUES (?, ?, ?)"
      ).run(task_id, streak, date);
    }

    // Return updated completions
    const updatedCompletions = db.prepare(
      "SELECT * FROM habit_completions WHERE task_id = ? ORDER BY date DESC"
    ).all(task_id);

    return NextResponse.json(updatedCompletions);
  } catch (error) {
    console.error("Error toggling habit completion:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/habit-completions?date=YYYY-MM-DD - Remove a completion
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    db.prepare("DELETE FROM habit_completions WHERE date = ?").run(date);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting habit completion:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}