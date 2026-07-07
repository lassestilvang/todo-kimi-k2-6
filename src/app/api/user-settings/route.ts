import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";
import type { UserSettings } from "@/types";

// Get user settings
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const db = getDb();
  const userId = middlewareResult.auth?.userId;

  if (!userId) {
    return errorResponse("Authentication required", 401);
  }

  const settings = db
    .prepare("SELECT * FROM user_settings WHERE user_id = ?")
    .get(userId) as UserSettings | undefined;

  if (!settings) {
    // Return defaults
    return jsonResponse({
      work_start_hour: 9,
      work_end_hour: 17,
      preferred_pomodoro_minutes: 25,
      preferred_break_minutes: 5,
      theme: "system",
      language: "en",
      timezone: "UTC",
    }, 200, middlewareResult.headers);
  }

  return jsonResponse({ settings }, 200, middlewareResult.headers);
}

// Update user settings
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      work_start_hour,
      work_end_hour,
      preferred_pomodoro_minutes,
      preferred_break_minutes,
      theme,
      language,
      timezone,
    } = body;

    const db = getDb();

    // Check if settings exist
    const existing = db.prepare("SELECT id FROM user_settings WHERE user_id = ?").get(1);

    let settings: UserSettings;
    if (existing) {
      db.prepare(
        `UPDATE user_settings SET
          work_start_hour = COALESCE(?, work_start_hour),
          work_end_hour = COALESCE(?, work_end_hour),
          preferred_pomodoro_minutes = COALESCE(?, preferred_pomodoro_minutes),
          preferred_break_minutes = COALESCE(?, preferred_break_minutes),
          theme = COALESCE(?, theme),
          language = COALESCE(?, language),
          timezone = COALESCE(?, timezone),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?`
      ).run(
        work_start_hour,
        work_end_hour,
        preferred_pomodoro_minutes,
        preferred_break_minutes,
        theme,
        language,
        timezone,
        1
      );
      settings = db
        .prepare("SELECT * FROM user_settings WHERE user_id = ?")
        .get(1) as UserSettings;
    } else {
      const result = db
        .prepare(
          `INSERT INTO user_settings (user_id, work_start_hour, work_end_hour, preferred_pomodoro_minutes, preferred_break_minutes, theme, language, timezone)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          1,
          work_start_hour || 9,
          work_end_hour || 17,
          preferred_pomodoro_minutes || 25,
          preferred_break_minutes || 5,
          theme || "system",
          language || "en",
          timezone || "UTC"
        );
      settings = db
        .prepare("SELECT * FROM user_settings WHERE id = ?")
        .get(result.lastInsertRowid) as UserSettings;
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}