import { NextRequest, NextResponse } from "next/server";
import { generateDailySummary, generateWeeklySummary } from "@/lib/email/summaries";
import { getDb } from "@/lib/db";

/**
 * Email API routes.
 *
 * POST /api/email/send - Send a summary email to a user
 */

interface EmailRequest {
  userId: number;
  type: "daily" | "weekly";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EmailRequest;
    const { userId, type } = body;

    if (!userId || !type) {
      return NextResponse.json({ error: "userId and type are required" }, { status: 400 });
    }

    const db = getDb();

    // Get user
    const user = db
      .prepare("SELECT email, name FROM users WHERE id = ?")
      .get(userId) as { email: string; name: string } | undefined;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get tasks for the user
    const tasks = db
      .prepare(
        `SELECT t.id, t.name, t.priority, t.due_date as dueDate, t.completed,
         CASE
           WHEN t.due_date IS NULL THEN 999
           WHEN date(t.due_date) < date('now') THEN cast(strftime('%s', 'now') - strftime('%s', t.due_date) / 86400 as integer) * -1
           ELSE cast((strftime('%s', t.due_date) - strftime('%s', 'now')) / 86400 as integer)
         END as daysUntilDue
         FROM tasks t
         WHERE t.assignee_id = ? OR t.created_by = ?`
      )
      .all(userId, userId) as Array<{
        id: number;
        name: string;
        priority: string;
        dueDate: string | null;
        completed: number;
        daysUntilDue: number;
      }>;

    const taskSummaries = tasks.map((t) => ({
      ...t,
      completed: t.completed === 1,
    }));

    // Generate HTML
    const html =
      type === "daily"
        ? generateDailySummary(taskSummaries, user.name || user.email)
        : generateWeeklySummary(taskSummaries, user.name || user.email);

    // In a real implementation, this would send the email via Resend/SendGrid
    // For now, we'll log it
    console.log(`Email to ${user.email}:`, html.substring(0, 100) + "...");

    return NextResponse.json({ success: true, email: user.email });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}