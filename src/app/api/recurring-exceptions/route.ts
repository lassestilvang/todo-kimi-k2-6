import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/config";

// GET /api/recurring-exceptions?taskId=123 - Get exceptions for a task
export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  try {
    const db = getDb();
    const exceptions = db.prepare(
      "SELECT * FROM recurring_exceptions WHERE task_id = ? ORDER BY exception_date ASC"
    ).all(parseInt(taskId, 10));

    return NextResponse.json(exceptions);
  } catch (error) {
    console.error("Error fetching recurring exceptions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/recurring-exceptions - Add an exception
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { task_id, exception_date } = body;

    if (!task_id || !exception_date) {
      return NextResponse.json({ error: "Task ID and exception date are required" }, { status: 400 });
    }

    const db = getDb();

    // Verify task belongs to user
    const task = db.prepare("SELECT id FROM tasks WHERE id = ? AND (created_by = ? OR assignee_id = ?)")
      .get(task_id, session.user.id, session.user.id) as any;

    if (!task) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    // Add exception (ignore if already exists)
    const result = db.prepare(
      "INSERT OR IGNORE INTO recurring_exceptions (task_id, exception_date) VALUES (?, ?)"
    ).run(task_id, exception_date);

    const exception = db.prepare(
      "SELECT * FROM recurring_exceptions WHERE task_id = ? AND exception_date = ?"
    ).get(task_id, exception_date);

    return NextResponse.json(exception, { status: 201 });
  } catch (error) {
    console.error("Error adding recurring exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/recurring-exceptions/:id - Remove an exception
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Exception ID is required" }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Verify the exception belongs to a task owned by the user
    const exception = db.prepare(`
      SELECT re.* FROM recurring_exceptions re
      INNER JOIN tasks t ON re.task_id = t.id
      WHERE re.id = ? AND (t.created_by = ? OR t.assignee_id = ?)
    `).get(parseInt(id, 10), session.user.id, session.user.id) as any;

    if (!exception) {
      return NextResponse.json({ error: "Exception not found or access denied" }, { status: 404 });
    }

    db.prepare("DELETE FROM recurring_exceptions WHERE id = ?").run(parseInt(id, 10));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing recurring exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}