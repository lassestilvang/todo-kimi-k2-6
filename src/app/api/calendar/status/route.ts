import { NextRequest, NextResponse } from "next/server";
import { getCalendarSync } from "@/lib/actions/calendar";

/**
 * GET /api/calendar/status
 * Get the current calendar sync status for the user
 */
export async function GET(_request: NextRequest) {
  try {
    // In production, get userId from session
    // For now, using user ID 1 (demo/test mode)
    const userId = 1;

    const calendarConfig = await getCalendarSync(userId);

    if (!calendarConfig) {
      return NextResponse.json({
        connected: false,
        provider: null,
        lastSync: null,
      });
    }

    return NextResponse.json({
      connected: calendarConfig.enabled,
      provider: calendarConfig.provider,
      lastSync: calendarConfig.created_at,
      expiresAt: calendarConfig.expires_at,
    });
  } catch (error) {
    console.error("Error fetching calendar status:", error);
    return NextResponse.json({
      connected: false,
      provider: null,
      lastSync: null,
      error: "Failed to fetch calendar status",
    });
  }
}