import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateDailySummary } from "@/lib/email/summaries";

/**
 * Daily Summary Cron Job
 *
 * GET /api/cron/daily-summary - Send daily summaries to all users
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Get all users with email notifications enabled
    const users = db
      .prepare(
        `SELECT u.id, u.email, u.name, ns.enabled, ns.daily_summary
         FROM users u
         JOIN notification_settings ns ON u.id = ns.user_id
         WHERE ns.enabled = 1 AND ns.daily_summary = 1`
      )
      .all() as Array<{
        id: number;
        email: string;
        name: string | null;
        enabled: number;
        daily_summary: number;
      }>;

    let sent = 0;
    for (const user of users) {
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
        .all(user.id, user.id) as Array<{
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
      const html = generateDailySummary(taskSummaries, user.name || user.email);

      // Send email (log for now)
      console.log(`Daily summary sent to ${user.email}`);
      sent++;
    }

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    console.error("Error sending daily summaries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}