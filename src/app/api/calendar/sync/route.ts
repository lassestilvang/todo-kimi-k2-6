import { NextRequest, NextResponse } from "next/server";
import { getTasks, getCalendarSync } from "@/lib/actions/tasks";
import { syncTasksToCalendar, getAuthUrl } from "@/lib/calendar";
import type { Task } from "@/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (action === "auth") {
    // Redirect to Google OAuth
    const state = Math.random().toString(36).substring(2, 15);
    const authUrl = getAuthUrl("google", state);
    return Response.redirect(authUrl);
  }

  return NextResponse.json({ message: "Calendar sync endpoint" });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tasks: taskIds } = body;

    // Get stored calendar config (using default user ID 1)
    // In a production app, get userId from session
    const userId = 1;
    const calendarConfig = await getCalendarSync(userId);

    if (!calendarConfig) {
      return NextResponse.json({ error: "Calendar not configured. Please connect your calendar first." }, { status: 400 });
    }

    // Get tasks to sync
    const allTasks = await getTasks({ includeCompleted: true });
    const tasksToSync = taskIds
      ? allTasks.filter((t) => taskIds.includes(t.id))
      : allTasks;

    // Filter tasks with dates
    const tasksWithDates = tasksToSync.filter((t) => t.date);

    const result = await syncTasksToCalendar(
      {
        provider: calendarConfig.provider,
        accessToken: calendarConfig.access_token,
        refreshToken: calendarConfig.refresh_token || undefined,
        expiresAt: calendarConfig.expires_at || undefined,
      },
      tasksWithDates as Task[]
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}