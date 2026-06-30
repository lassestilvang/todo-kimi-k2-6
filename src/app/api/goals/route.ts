import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Goal, CreateGoalInput } from "@/types";

// Get all goals for the current user
export async function GET() {
  const db = getDb();
  const goals = db.prepare("SELECT * FROM goals ORDER BY created_at DESC").all() as Goal[];
  return NextResponse.json(goals);
}

// Create a new goal
export async function POST(request: Request) {
  try {
    const body = await request.json() as CreateGoalInput & { user_id: number };
    const { name, description, target_count, target_unit, period } = body;

    if (!name || !target_count || !target_unit || !period) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO goals (user_id, name, description, target_count, target_unit, period)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(body.user_id, name, description || null, target_count, target_unit, period);

    const goal = db
      .prepare("SELECT * FROM goals WHERE id = ?")
      .get(result.lastInsertRowid as number) as Goal;

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}