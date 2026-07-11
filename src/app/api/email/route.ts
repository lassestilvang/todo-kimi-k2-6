import { NextRequest, NextResponse } from "next/server";
import { sendTaskReminderEmail, sendDueSoonEmail, sendWeeklyDigest } from "@/lib/email";
import { getDueReminders } from "@/lib/actions/reminders";
import { checkDueTasks, checkOverdueTasks, sendWeeklyDigests } from "@/lib/notifications/cron";
import { getDb } from "@/lib/db";

// GET /api/email/reminders - Send reminder emails for due tasks
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    // Handle admin actions
    if (action === "run-all") {
      const result = await Promise.all([checkDueTasks(), checkOverdueTasks(), sendWeeklyDigests()]);
      return NextResponse.json({
        dueTodaySent: result[0],
        overdueSent: result[1],
        weeklyDigestsSent: result[2],
      });
    }

    // Get due reminders
    const reminders = await getDueReminders();

    let sent = 0;
    const errors: string[] = [];

    for (const reminder of reminders) {
      try {
        // Get user email from users table via task
        const user = getDb()
          .prepare("SELECT u.email, t.user_id FROM users u JOIN tasks t ON u.id = t.user_id WHERE t.id = ?")
          .get(reminder.task_id) as { email: string; user_id: number } | undefined;

        if (user?.email) {
          // Get task details
          const task = getDb()
            .prepare("SELECT name, description, deadline, priority FROM tasks WHERE id = ?")
            .get(reminder.task_id) as
            | { name: string; description: string | null; deadline: string | null; priority: string }
            | undefined;

          if (task) {
            const success = await sendTaskReminderEmail(user.email, {
              id: reminder.task_id,
              name: task.name,
              description: task.description,
              deadline: task.deadline,
              priority: task.priority as "critical" | "high" | "medium" | "low" | "none",
            });
            if (success) sent++;
          }
        }
      } catch {
        errors.push(`Failed to send email for task ${reminder.task_name}`);
      }
    }

    return NextResponse.json({ sent, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send reminder emails";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/email - Send a single email or trigger notification check
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, type, task, action } = body;

    // Handle admin actions
    if (action === "check-due-today") {
      const sent = await checkDueTasks();
      return NextResponse.json({ success: true, sent });
    }

    if (action === "check-overdue") {
      const sent = await checkOverdueTasks();
      return NextResponse.json({ success: true, sent });
    }

    if (action === "weekly-digest") {
      const sent = await sendWeeklyDigests();
      return NextResponse.json({ success: true, sent });
    }

    // Handle individual email sending
    if (!to || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    switch (type) {
      case "reminder":
        await sendTaskReminderEmail(to, task);
        break;
      case "due_soon":
        await sendDueSoonEmail(to, task);
        break;
      case "weekly_digest":
        await sendWeeklyDigest(to, task);
        break;
      default:
        return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}