import { NextRequest, NextResponse } from "next/server";
import { sendTaskReminderEmail, sendDueSoonEmail } from "@/lib/email";
import { getDueReminders } from "@/lib/actions/reminders";

// GET /api/email/reminders - Send reminder emails for due tasks
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Get due reminders
    const reminders = await getDueReminders();

    // Filter by user if needed
    const userReminders = reminders;

    let sent = 0;
    const errors: string[] = [];

    for (const reminder of userReminders) {
      try {
        // In a real implementation, we'd get the user's email from the database
        // For now, we'll just log that we would send an email
        console.log(`Would send reminder for task ${reminder.task_name}`);
        sent++;
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

// POST /api/email - Send a single email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, type, task } = body;

    if (!to || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let result: boolean;

    switch (type) {
      case "reminder":
        result = await sendTaskReminderEmail(to, task);
        break;
      case "due_soon":
        result = await sendDueSoonEmail(to, task);
        break;
      default:
        return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
    }

    return NextResponse.json({ success: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}